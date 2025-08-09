// src/app/services/auth-interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from, switchMap, of } from 'rxjs';
import { AuthService } from './auth';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Check if request is to our API
    if (!req.url.includes('localhost:8080/api')) {
      return next.handle(req);
    }

    // Get current user
    const currentUser = this.authService.getCurrentUser();

    if (currentUser) {
      // Get Firebase ID token and add to headers
      return from(currentUser.getIdToken()).pipe(
        switchMap(token => {
          const authReq = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`)
          });
          return next.handle(authReq);
        })
      );
    } else {
      // No user logged in, proceed without token
      return next.handle(req);
    }
  }
}
