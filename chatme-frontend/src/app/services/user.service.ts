// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  provider: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) { }

  // Save user to database (called during authentication)
  saveUser(user: AppUser): Observable<AppUser> {
    return this.http.post<AppUser>(this.apiUrl, user);
  }

  // Get all users except the current user (for chat partner selection)
  getAllUsers(excludeUserId?: string): Observable<AppUser[]> {
    let params = new HttpParams();
    if (excludeUserId) {
      params = params.set('excludeUserId', excludeUserId);
    }

    return this.http.get<AppUser[]>(this.apiUrl, { params });
  }

  // Get user by ID
  getUserById(userId: string): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.apiUrl}/${userId}`);
  }

  // Get user by email
  getUserByEmail(email: string): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.apiUrl}/email/${email}`);
  }

  // Search users by name
  searchUsers(query: string, excludeUserId?: string): Observable<AppUser[]> {
    let params = new HttpParams().set('query', query);
    if (excludeUserId) {
      params = params.set('excludeUserId', excludeUserId);
    }

    return this.http.get<AppUser[]>(`${this.apiUrl}/search`, { params });
  }

  // Update user status (online/offline)
  updateUserStatus(userId: string, status: string): Observable<string> {
    const params = new HttpParams().set('status', status);
    return this.http.put<string>(`${this.apiUrl}/${userId}/status`, null, { params });
  }

  // Get total user count
  getUserCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count`);
  }

  // Helper method to format user display name
  getUserDisplayName(user: AppUser): string {
    if (user.name && user.name.trim()) {
      return user.name;
    }
    if (user.email) {
      return user.email.split('@')[0]; // Use email username part
    }
    return 'Unknown User';
  }

  // Helper method to get user avatar
  getUserAvatar(user: AppUser): string {
    if (user.photoURL) {
      return user.photoURL;
    }
    // Return default avatar based on first letter of name
    const firstLetter = this.getUserDisplayName(user).charAt(0).toUpperCase();
    return `https://ui-avatars.com/api/?name=${firstLetter}&background=667eea&color=fff&size=40`;
  }
}
