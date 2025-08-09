// src/app/components/chat/chat.ts - FIXED UI Updates for Real-time Messages
import { Component, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '@angular/fire/auth';

// Import services and interfaces
import { WebsocketService, ChatMessage } from '../../services/websocket';
import { ChatService } from '../../services/chat';
import { AuthService } from '../../services/auth';
import { UserService, AppUser } from '../../services/user.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  currentUser: User | null = null;
  currentUserId: string = '';
  selectedUser: AppUser | null = null;
  newMessage: string = '';
  messages: ChatMessage[] = [];
  availableUsers: AppUser[] = [];
  isConnected: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  typingIndicator: {senderId: string, isTyping: boolean} | null = null;
  loadingUsers: boolean = false;

  private subscriptions: Subscription = new Subscription();
  private shouldScrollToBottom = false;

  constructor(
    private websocketService: WebsocketService,
    private chatService: ChatService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef, // Change detection
    private ngZone: NgZone // Zone for proper Angular updates
  ) {}

  ngOnInit(): void {
    // Subscribe to authentication state
    this.subscriptions.add(
      this.authService.currentUser$.subscribe((user: User | null) => {
        if (user) {
          this.currentUser = user;
          this.currentUserId = user.uid;
          this.initializeChat();
        } else {
          this.router.navigate(['/login']);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.websocketService.disconnect();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private initializeChat(): void {
    //  Subscribe to messages with proper UI updates
    this.subscriptions.add(
      this.websocketService.messages$.subscribe((messages: ChatMessage[]) => {
        console.log('📨 Chat component received messages update:', messages.length);

        //  Run inside Angular zone for proper UI updates
        this.ngZone.run(() => {
          // Filter messages for current conversation only
          if (this.selectedUser) {
            const filteredMessages = messages.filter((msg: ChatMessage) =>
              (msg.senderId === this.currentUserId && msg.receiverId === this.selectedUser!.uid) ||
              (msg.senderId === this.selectedUser!.uid && msg.receiverId === this.currentUserId)
            );

            // Only update if messages actually changed
            if (JSON.stringify(filteredMessages) !== JSON.stringify(this.messages)) {
              this.messages = filteredMessages;
              this.shouldScrollToBottom = true;

              // Manually trigger change detection
              this.cdr.detectChanges();

              console.log('✅ UI UPDATED with filtered messages:', this.messages.length);
            }
          } else {
            // When no user selected, show all messages
            if (JSON.stringify(messages) !== JSON.stringify(this.messages)) {
              this.messages = messages;
              this.cdr.detectChanges();
            }
          }
        });
      })
    );

    // Subscribe to connection status
    this.subscriptions.add(
      this.websocketService.connected$.subscribe((connected: boolean) => {
        this.ngZone.run(() => {
          console.log('🔌 Connection status changed:', connected);
          this.isConnected = connected;

          if (this.currentUserId) {
            this.loadAvailableUsers();
          }

          this.cdr.detectChanges();
        });
      })
    );

    // Subscribe to typing indicators
    this.subscriptions.add(
      this.websocketService.typing$.subscribe((typing: any) => {
        this.ngZone.run(() => {
          console.log('✍️ Typing indicator received:', typing);
          this.typingIndicator = typing;
          this.cdr.detectChanges();
        });
      })
    );
  }

  private loadAvailableUsers(): void {
    if (!this.currentUserId) {
      console.log('❌ No currentUserId set, cannot load users');
      return;
    }

    console.log('📋 Loading available users for:', this.currentUserId);
    this.loadingUsers = true;
    this.errorMessage = '';

    this.subscriptions.add(
      this.userService.getAllUsers(this.currentUserId).subscribe({
        next: (users: AppUser[]) => {
          this.ngZone.run(() => {
            console.log(`✅ Successfully loaded ${users.length} available users:`, users);
            this.availableUsers = users;
            this.loadingUsers = false;
            this.cdr.detectChanges();
          });
        },
        error: (error: any) => {
          this.ngZone.run(() => {
            console.error('❌ Error loading users:', error);
            this.errorMessage = 'Failed to load available users. Click refresh to try again.';
            this.loadingUsers = false;
            this.availableUsers = [];
            this.cdr.detectChanges();
          });
        }
      })
    );
  }

  async connectToChat(): Promise<void> {
    if (!this.currentUser) {
      this.errorMessage = 'No authenticated user found';
      return;
    }

    try {
      this.isLoading = true;
      this.errorMessage = '';
      this.currentUserId = this.currentUser.uid;

      console.log(`🚀 Starting connection process for user: ${this.currentUser.email} (${this.currentUserId})`);

      // Load users first
      this.loadAvailableUsers();

      // Connect to WebSocket
      try {
        await this.websocketService.connect(this.currentUserId);
        console.log(`✅ Connected to WebSocket as ${this.currentUser.email}`);
      } catch (wsError) {
        console.warn('⚠️ WebSocket connection failed:', wsError);
      }

    } catch (error: any) {
      console.error('❌ Error in connection process:', error);
      this.errorMessage = 'Connection failed, but you can still browse users.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  selectUser(user: AppUser): void {
    if (user.uid === this.currentUserId) {
      alert("You can't chat with yourself!");
      return;
    }

    console.log('🎯 Selected user for chat:', user.email);
    this.selectedUser = user;
    this.errorMessage = '';
    this.loadChatHistory();
  }

  loadChatHistory(): void {
    if (!this.currentUserId || !this.selectedUser) return;

    console.log(`📋 Loading chat history between ${this.currentUserId} and ${this.selectedUser.uid}`);
    this.isLoading = true;

    this.subscriptions.add(
      this.chatService.getRecentChatHistory(this.currentUserId, this.selectedUser.uid)
        .subscribe({
          next: (messages: ChatMessage[]) => {
            this.ngZone.run(() => {
              console.log('✅ Loaded chat history:', messages.length, 'messages');
              this.websocketService.setMessages(messages);
              this.isLoading = false;
              this.shouldScrollToBottom = true;
              this.cdr.detectChanges();
            });
          },
          error: (error: any) => {
            this.ngZone.run(() => {
              console.error('❌ Error loading chat history:', error);
              this.errorMessage = 'Failed to load chat history';
              this.isLoading = false;
              this.cdr.detectChanges();
            });
          }
        })
    );
  }

  // Send message with immediate UI feedback
  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedUser || !this.currentUserId) {
      return;
    }

    try {
      const messageText = this.newMessage.trim();
      const receiverId = this.selectedUser.uid;

      console.log(`📤 SENDING MESSAGE: "${messageText}" to ${this.selectedUser.email}`);

      //  Clear input field right away
      this.newMessage = '';
      this.errorMessage = '';

      if (this.isConnected) {
        // Send via WebSocket
        this.websocketService.sendMessage(receiverId, messageText);
      } else {
        // Send via REST API
        console.log('📡 WebSocket not connected, sending via REST API');
        this.chatService.sendMessage(this.currentUserId, receiverId, messageText)
          .subscribe({
            next: (savedMessage: ChatMessage) => {
              this.ngZone.run(() => {
                console.log('✅ Message sent via REST API:', savedMessage);

                // 🔥 FORCE: Add message to UI immediately
                const currentMessages = this.websocketService.getCurrentMessages();
                this.websocketService.setMessages([...currentMessages, savedMessage]);

                this.cdr.detectChanges();
              });
            },
            error: (error: any) => {
              this.ngZone.run(() => {
                console.error('❌ Failed to send message via REST API:', error);
                this.errorMessage = 'Failed to send message';
                this.cdr.detectChanges();
              });
            }
          });
      }

      console.log(`✅ Message "${messageText}" processing...`);

    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      this.errorMessage = 'Failed to send message';
      this.cdr.detectChanges();
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onMessageInput(): void {
    if (this.selectedUser && this.isConnected) {
      this.websocketService.sendTypingIndicator(this.selectedUser.uid, this.newMessage.length > 0);
    }
  }

  getUserName(userId: string): string {
    if (userId === this.currentUserId && this.currentUser) {
      return this.currentUser.displayName || this.currentUser.email || 'You';
    }

    const user = this.availableUsers.find(u => u.uid === userId);
    if (user) {
      return this.userService.getUserDisplayName(user);
    }

    if (this.selectedUser && this.selectedUser.uid === userId) {
      return this.userService.getUserDisplayName(this.selectedUser);
    }

    return userId;
  }

  getUserDisplayName(user: AppUser): string {
    return this.userService.getUserDisplayName(user);
  }

  getUserAvatar(user: AppUser): string {
    return this.userService.getUserAvatar(user);
  }

  isMyMessage(message: ChatMessage): boolean {
    return message.senderId === this.currentUserId;
  }

  disconnect(): void {
    try {
      console.log('🔌 Disconnecting from WebSocket...');
      this.websocketService.disconnect();

      this.selectedUser = null;
      this.messages = [];
      this.errorMessage = '';
      this.cdr.detectChanges();

      console.log('✅ Disconnected from chat, returning to welcome screen');

    } catch (error: any) {
      console.error('❌ Error disconnecting:', error);
      this.errorMessage = 'Error disconnecting from chat';
      this.cdr.detectChanges();
    }
  }

  async signOut(): Promise<void> {
    try {
      this.websocketService.disconnect();
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('❌ Error signing out:', error);
      this.errorMessage = 'Error signing out';
    }
  }

  goBack(): void {
    this.selectedUser = null;
    this.messages = [];
    this.websocketService.clearMessages();
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  // Scroll to bottom with force
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          const container = this.messagesContainer.nativeElement;
          container.scrollTop = container.scrollHeight;
          console.log('📜 Scrolled to bottom');
        }, 10);
      }
    } catch (err) {
      console.log('Could not scroll to bottom:', err);
    }
  }

  formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  }

  isUserTyping(userId: string): boolean {
    return this.typingIndicator?.senderId === userId && this.typingIndicator?.isTyping === true;
  }

  refreshUsers(): void {
    this.loadAvailableUsers();
  }

  //  Force refresh UI (for debugging)
  forceRefreshUI(): void {
    console.log('🔄 Force refreshing UI...');
    this.cdr.detectChanges();
  }
}
