// src/app/services/chat.ts - FIXED with proper exports and imports
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Define ChatMessage interface locally to avoid circular imports
export interface ChatMessage {
  id?: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:8080/api/chat';

  constructor(private http: HttpClient) { }

  // Get chat history between two users (sorted oldest to newest)
  getChatHistory(user1: string, user2: string): Observable<ChatMessage[]> {
    const params = new HttpParams()
      .set('user1', user1)
      .set('user2', user2);

    return this.http.get<ChatMessage[]>(`${this.apiUrl}/history`, { params }).pipe(
      map(messages => this.sortMessagesAscending(messages))
    );
  }

  // Get recent chat history (last 50 messages, sorted oldest to newest)
  getRecentChatHistory(user1: string, user2: string): Observable<ChatMessage[]> {
    const params = new HttpParams()
      .set('user1', user1)
      .set('user2', user2);

    return this.http.get<ChatMessage[]>(`${this.apiUrl}/recent`, { params }).pipe(
      map(messages => this.sortMessagesAscending(messages))
    );
  }

  // Send message via REST API (alternative to WebSocket)
  sendMessage(senderId: string, receiverId: string, message: string): Observable<ChatMessage> {
    const messageData = {
      senderId,
      receiverId,
      message,
      senderName: 'User' // Optional: you can get this from auth service if needed
    };

    return this.http.post<ChatMessage>(`${this.apiUrl}/send`, messageData);
  }

  // Get messages sent by a user
  getMessagesBySender(userId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/sent/${userId}`).pipe(
      map(messages => this.sortMessagesAscending(messages))
    );
  }

  // Get messages received by a user
  getMessagesByReceiver(userId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/received/${userId}`).pipe(
      map(messages => this.sortMessagesAscending(messages))
    );
  }

  // Health check
  getHealthStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  // Get system info
  getSystemInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/info`);
  }

  /**
   * Helper method to sort messages in ascending order (oldest first, newest last)
   * This ensures messages display chronologically with newest at bottom
   */
  private sortMessagesAscending(messages: ChatMessage[]): ChatMessage[] {
    return messages.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB; // Ascending order (oldest first)
    });
  }
}
