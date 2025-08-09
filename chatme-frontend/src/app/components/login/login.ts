// src/app/components/login/login.ts - Enhanced with account switching
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  signUpForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showSignUp = false;
  currentUser: User | null = null; // Track current user

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    // Initialize forms
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.signUpForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    this.authService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
      if (user) {
        console.log('✅ User already logged in on login page:', user.email);
      }
    });
  }

  // Continue with current account
  continueWithCurrentAccount(): void {
    if (this.currentUser) {
      console.log('🔄 Continuing with current account');
      this.router.navigate(['/chat']);
    }
  }

  // Switch account (sign out current user)
  async switchAccount(): Promise<void> {
    try {
      console.log('🔄 Switching account - signing out current user');
      await this.authService.signOut();
      this.currentUser = null;
      this.errorMessage = '';
      console.log('✅ Signed out successfully - ready for new login');
    } catch (error: any) {
      console.error('❌ Error switching account:', error);
      this.errorMessage = 'Error switching account: ' + error.message;
    }
  }

  // Password match validator
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  // Handle email/password sign in
  async signIn(): Promise<void> {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.signIn(email, password);
      console.log('✅ Sign in successful');
      this.router.navigate(['/chat']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
      console.error('❌ Sign in error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Handle email/password sign up
  async signUp(): Promise<void> {
    if (this.signUpForm.invalid) {
      this.markFormGroupTouched(this.signUpForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { name, email, password } = this.signUpForm.value;
      await this.authService.signUp(email, password, name);
      console.log('✅ Sign up successful');
      this.router.navigate(['/chat']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
      console.error('❌ Sign up error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Handle Google sign in
  async googleSignIn(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.signInWithGoogle();
      console.log('✅ Google sign in successful');
      this.router.navigate(['/chat']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error);
      console.error('❌ Google sign in error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Toggle between login and signup
  toggleSignUp(): void {
    this.showSignUp = !this.showSignUp;
    this.errorMessage = '';
    this.loginForm.reset();
    this.signUpForm.reset();
  }

  // Helper method to mark all form fields as touched
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Convert Firebase errors to user-friendly messages
  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/popup-closed-by-user':
        return 'Sign in was cancelled.';
      case 'auth/popup-blocked':
        return 'Pop-up blocked. Please allow pop-ups for this site.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      default:
        return error.message || 'An error occurred during authentication.';
    }
  }

  // Helper methods for template
  get currentForm(): FormGroup {
    return this.showSignUp ? this.signUpForm : this.loginForm;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.currentForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.currentForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['passwordMismatch']) return 'Passwords do not match';
    }
    return '';
  }
}
