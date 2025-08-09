// src/app/app.routes.ts - Fixed with Auth Guard
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'chat',
    loadComponent: () => import('./components/chat/chat').then(m => m.ChatComponent),
    canActivate: [AuthGuard] // This protects the chat route
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
