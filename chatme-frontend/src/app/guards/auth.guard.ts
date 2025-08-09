// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        console.log('🔐 Auth Guard - Checking user:', user?.email || 'No user');
        if (user) {
          // User is authenticated, allow access to chat
          return true;
        } else {
          // User is not authenticated, redirect to login
          console.log('🚪 Redirecting to login page');
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}
