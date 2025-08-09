// src/app/services/auth.ts - Fixed Firebase injection context
import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  onAuthStateChanged,
  updateProfile
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth); // Use inject() instead of constructor injection
  private http = inject(HttpClient);

  private googleProvider = new GoogleAuthProvider();
  currentUser$: Observable<User | null>;

  constructor() {
    // Create observable for auth state using proper injection
    this.currentUser$ = new Observable<User | null>((subscriber) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user: User | null) => {
        subscriber.next(user);
      });
      return () => unsubscribe();
    });
  }

  // 🔐 Email/password sign-in
  async signIn(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // ✅ Email/password sign-up
  async signUp(email: string, password: string, displayName?: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Update display name if provided
      if (displayName && displayName.trim()) {
        await updateProfile(user, {
          displayName: displayName.trim()
        });
      }

      // Save user to backend database
      await this.saveUserToBackend(user, 'email');

      console.log('User registered successfully:', user.uid);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // 🔐 Google sign-in + Save user to MongoDB via Spring Boot
  async signInWithGoogle(): Promise<void> {
    try {
      const credential = await signInWithPopup(this.auth, this.googleProvider);
      const user = credential.user;

      // Save user to backend database
      await this.saveUserToBackend(user, 'google');

    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }

  // 💾 Save user to backend database
  private async saveUserToBackend(user: User, provider: string): Promise<void> {
    try {
      await this.http.post('http://localhost:8080/api/users', {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        provider: provider
      }).toPromise();

      console.log('User saved to backend database');
    } catch (error) {
      console.error('Error saving user to backend:', error);
      // Don't throw error here - authentication succeeded even if backend save fails
    }
  }

  // 🔓 Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // 👤 Get current user
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // 🔍 Check if user is authenticated
  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }
}
