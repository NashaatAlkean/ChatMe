// src/app/app.ts - Always start at login page
import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  title = 'chatme-frontend';
  currentUser: User | null = null;
  isLoading = true;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🚀 AppComponent initialized');
    console.log('🌐 Initial URL:', this.router.url);

    // ALWAYS START AT LOGIN PAGE
    const currentPath = this.router.url;
    if (currentPath === '/' || currentPath === '') {
      console.log('🏠 Redirecting to login page (default behavior)');
      this.router.navigate(['/login']);
    }

    // Subscribe to authentication state changes
    this.authService.currentUser$.subscribe(user => {
      console.log('🔥 Auth state changed:', user?.email || 'No user');
      console.log('📍 Current URL when auth changed:', this.router.url);

      this.currentUser = user;
      this.isLoading = false;

      // Only handle automatic redirections for specific scenarios
      const currentPath = this.router.url;

      if (user) {
        console.log('✅ User is logged in');
        // Only redirect if user manually navigates to login after being authenticated
        if (currentPath === '/login') {
          console.log('💡 User is logged in but on login page - staying on login for user choice');
          // Don't automatically redirect - let user decide
        }
      } else {
        console.log('❌ No user logged in');
        // Only redirect to login if user tries to access protected routes
        if (currentPath === '/chat') {
          console.log('🚪 Redirecting to login from protected chat page');
          this.router.navigate(['/login']);
        }
      }
    });
  }
}
