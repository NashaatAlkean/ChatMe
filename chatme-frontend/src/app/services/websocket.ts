// src/app/services/websocket.ts - FIXED for Modern STOMP v7 API
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface ChatMessage {
  id?: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp?: string;
}

export interface TypingIndicator {
  senderId: string;
  isTyping: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  // Subjects
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private typingSubject = new BehaviorSubject<TypingIndicator | null>(null);

  // Public observables
  public messages$ = this.messagesSubject.asObservable();
  public connected$ = this.connectedSubject.asObservable();
  public typing$ = this.typingSubject.asObservable();

  // WebSocket connection
  private stompClient: any = null;
  private currentUserId: string = '';
  private isConnecting: boolean = false;

  constructor(private http: HttpClient) {}

  async connect(userId: string): Promise<void> {
    if (this.isConnecting || this.connectedSubject.value) {
      console.log('Already connecting or connected');
      return;
    }

    console.log('🔄 Connecting to WebSocket for user:', userId);
    this.isConnecting = true;
    this.currentUserId = userId;

    return new Promise((resolve, reject) => {
      try {
        // Check for required libraries
        const SockJS = (window as any).SockJS;
        const StompJs = (window as any).StompJs || (window as any).Stomp;

        console.log('🔍 Library availability:');
        console.log('- SockJS:', !!SockJS);
        console.log('- StompJs:', !!StompJs);
        console.log('- StompJs.Client:', !!(StompJs && StompJs.Client));

        if (!SockJS) {
          throw new Error('SockJS not available. Please check if SockJS script is loaded.');
        }

        if (!StompJs) {
          throw new Error('STOMP library not available. Please check if STOMP script is loaded.');
        }

        // Create WebSocket factory function for SockJS
        const webSocketFactory = () => {
          console.log('🔌 Creating SockJS connection to: http://localhost:8080/ws');
          return new SockJS('http://localhost:8080/ws');
        };

        // FIXED: Use modern STOMP v7 API with Client constructor
        if (StompJs.Client) {
          // Modern STOMP v7+ API
          console.log('📡 Using modern STOMP Client API');

          this.stompClient = new StompJs.Client({
            webSocketFactory: webSocketFactory,
            connectHeaders: {
              'userId': userId
            },
            debug: (msg: string) => {
              console.log('STOMP Debug:', msg);
            },
            reconnectDelay: 5000, // Reconnect after 5 seconds
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            // Success callback
            onConnect: (frame: any) => {
              console.log('✅ Modern STOMP connected successfully:', frame);
              this.connectedSubject.next(true);
              this.isConnecting = false;

              try {
                // Subscribe to personal message queue
                this.stompClient.subscribe(`/user/queue/messages`, (message: any) => {
                  console.log('📨 Received personal message:', message.body);
                  this.handleIncomingMessage(JSON.parse(message.body));
                });

                // Subscribe to typing indicators
                this.stompClient.subscribe(`/user/queue/typing`, (message: any) => {
                  console.log('✍️ Received typing indicator:', message.body);
                  this.typingSubject.next(JSON.parse(message.body));
                });

                // Subscribe to chat topic
                this.stompClient.subscribe(`/topic/chat/${userId}`, (message: any) => {
                  console.log('📨 Received topic message:', message.body);
                  this.handleIncomingMessage(JSON.parse(message.body));
                });

                console.log('✅ All subscriptions established');
                resolve();

              } catch (subscribeError) {
                console.error('❌ Error setting up subscriptions:', subscribeError);
                reject(subscribeError);
              }
            },

            // Error callback
            onStompError: (frame: any) => {
              console.error('❌ STOMP error:', frame);
              this.connectedSubject.next(false);
              this.isConnecting = false;
              reject(new Error(`STOMP error: ${frame.headers.message}`));
            },

            // WebSocket error callback
            onWebSocketError: (error: any) => {
              console.error('❌ WebSocket error:', error);
              this.connectedSubject.next(false);
              this.isConnecting = false;
              reject(error);
            },

            // Connection closed callback
            onWebSocketClose: (closeEvent: any) => {
              console.log('🔌 WebSocket connection closed:', closeEvent);
              this.connectedSubject.next(false);
            }
          });

          // Activate the client (start connection)
          console.log('🚀 Activating STOMP client...');
          this.stompClient.activate();

        } else if (StompJs.over) {
          // Fallback to legacy STOMP API
          console.log('📡 Using legacy STOMP API (Stomp.over)');

          const socket = webSocketFactory();
          this.stompClient = StompJs.over(socket);

          this.stompClient.debug = (msg: string) => console.log('STOMP:', msg);

          this.stompClient.connect(
            { 'userId': userId },
            // Success callback
            (frame: any) => {
              console.log('✅ Legacy STOMP connected successfully:', frame);
              this.connectedSubject.next(true);
              this.isConnecting = false;

              // Set up subscriptions
              this.stompClient.subscribe(`/user/queue/messages`, (message: any) => {
                console.log('📨 Received personal message:', message.body);
                this.handleIncomingMessage(JSON.parse(message.body));
              });

              this.stompClient.subscribe(`/user/queue/typing`, (message: any) => {
                console.log('✍️ Received typing indicator:', message.body);
                this.typingSubject.next(JSON.parse(message.body));
              });

              this.stompClient.subscribe(`/topic/chat/${userId}`, (message: any) => {
                console.log('📨 Received topic message:', message.body);
                this.handleIncomingMessage(JSON.parse(message.body));
              });

              resolve();
            },
            // Error callback
            (error: any) => {
              console.error('❌ Legacy STOMP connection failed:', error);
              this.connectedSubject.next(false);
              this.isConnecting = false;
              reject(error);
            }
          );

        } else {
          throw new Error('No compatible STOMP API found. Neither modern Client nor legacy over() method available.');
        }

      } catch (error) {
        console.error('❌ Error setting up WebSocket:', error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  sendMessage(receiverId: string, message: string): void {
    if (!this.stompClient || !this.connectedSubject.value) {
      console.error('❌ WebSocket not connected, falling back to REST API');
      this.sendViaRestApi(receiverId, message);
      return;
    }

    console.log('📤 Sending message via WebSocket:', {
      from: this.currentUserId,
      to: receiverId,
      message
    });

    try {
      const messageData = {
        senderId: this.currentUserId,
        receiverId: receiverId,
        message: message
      };

      // Use modern or legacy send method
      if (this.stompClient.publish) {
        // Modern STOMP API
        this.stompClient.publish({
          destination: '/app/chat',
          body: JSON.stringify(messageData)
        });
      } else if (this.stompClient.send) {
        // Legacy STOMP API
        this.stompClient.send('/app/chat', {}, JSON.stringify(messageData));
      } else {
        throw new Error('No send method available on STOMP client');
      }

      console.log('✅ Message sent via WebSocket');

    } catch (error) {
      console.error('❌ Failed to send via WebSocket, falling back to REST:', error);
      this.sendViaRestApi(receiverId, message);
    }
  }

  sendTypingIndicator(receiverId: string, isTyping: boolean): void {
    if (!this.stompClient || !this.connectedSubject.value) {
      return;
    }

    try {
      const typingData = {
        senderId: this.currentUserId,
        receiverId: receiverId,
        isTyping: isTyping.toString()
      };

      if (this.stompClient.publish) {
        this.stompClient.publish({
          destination: '/app/typing',
          body: JSON.stringify(typingData)
        });
      } else if (this.stompClient.send) {
        this.stompClient.send('/app/typing', {}, JSON.stringify(typingData));
      }

      console.log('✍️ Typing indicator sent:', { receiverId, isTyping });
    } catch (error) {
      console.error('❌ Failed to send typing indicator:', error);
    }
  }

  private sendViaRestApi(receiverId: string, message: string): void {
    const messageData = {
      senderId: this.currentUserId,
      receiverId: receiverId,
      message: message,
      senderName: this.currentUserId
    };

    this.http.post<ChatMessage>('http://localhost:8080/api/chat/send', messageData).subscribe({
      next: (savedMessage: ChatMessage) => {
        console.log('✅ Message sent via REST API:', savedMessage);
        this.handleIncomingMessage(savedMessage);
      },
      error: (error: any) => {
        console.error('❌ Failed to send message via REST API:', error);
      }
    });
  }

  private handleIncomingMessage(message: ChatMessage): void {
    console.log('📨 Processing incoming message:', message);

    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }

    const currentMessages = this.messagesSubject.value;
    const updatedMessages = this.addMessageInOrder([...currentMessages], message);
    this.messagesSubject.next(updatedMessages);

    console.log('✅ Message added to chat. Total messages:', updatedMessages.length);
  }

  setMessages(messages: ChatMessage[]): void {
    console.log('📋 Loading', messages.length, 'messages from history');
    this.messagesSubject.next(messages);
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
  }

  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket');

    if (this.stompClient) {
      try {
        if (this.stompClient.deactivate) {
          // Modern STOMP API
          this.stompClient.deactivate();
        } else if (this.stompClient.disconnect) {
          // Legacy STOMP API
          this.stompClient.disconnect(() => {
            console.log('✅ WebSocket disconnected');
          });
        }
      } catch (error) {
        console.warn('⚠️ Error during disconnect:', error);
      }
    }

    this.connectedSubject.next(false);
    this.currentUserId = '';
    this.clearMessages();
    this.typingSubject.next(null);
    this.stompClient = null;
  }

  private addMessageInOrder(messages: ChatMessage[], newMessage: ChatMessage): ChatMessage[] {
    const isDuplicate = messages.some(msg =>
      msg.id === newMessage.id ||
      (msg.senderId === newMessage.senderId &&
       msg.receiverId === newMessage.receiverId &&
       msg.message === newMessage.message &&
       msg.timestamp === newMessage.timestamp)
    );

    if (isDuplicate) {
      console.log('🔄 Duplicate message detected, skipping');
      return messages;
    }

    if (!newMessage.timestamp) {
      return [...messages, newMessage];
    }

    const newTimestamp = new Date(newMessage.timestamp).getTime();
    let insertIndex = messages.length;

    for (let i = messages.length - 1; i >= 0; i--) {
      const existingTimestamp = new Date(messages[i].timestamp || 0).getTime();
      if (newTimestamp >= existingTimestamp) {
        insertIndex = i + 1;
        break;
      }
    }

    const updatedMessages = [...messages];
    updatedMessages.splice(insertIndex, 0, newMessage);
    return updatedMessages;
  }

  // Utility methods
  getCurrentMessages(): ChatMessage[] {
    return this.messagesSubject.value;
  }

  getLastMessage(): ChatMessage | null {
    const messages = this.messagesSubject.value;
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }

  isCurrentUserTyping(): boolean {
    const typing = this.typingSubject.value;
    return typing?.senderId === this.currentUserId && typing?.isTyping === true;
  }

  isConnected(): boolean {
    return this.connectedSubject.value;
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }
}
