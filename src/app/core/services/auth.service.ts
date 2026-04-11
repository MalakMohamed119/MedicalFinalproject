import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, throwError, of } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { finalize } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:8080/Clinic/Authentication';
  private readonly tokenKey = 'auth_token';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /* ================= TOKEN ================= */

  private hasToken(): boolean {
    if (!this.isBrowser) return false;
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem(this.tokenKey) : null;
  }

  private setToken(token: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.tokenKey, token);
    this.isAuthenticatedSubject.next(true);
  }

  /* ================= SESSION ================= */

  private clearSession(): void {
    if (!this.isBrowser) {
      console.log('Not in browser environment, skipping clearSession');
      return;
    }
    
    console.log('Clearing session...');
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Reset auth state
    this.isAuthenticatedSubject.next(false);
    console.log('Session cleared, isAuthenticated set to false');
  }

  isLoggedIn(): boolean {
    return this.hasToken();
  }

  /* ================= LOGOUT ================= */

  logout(): void {
    console.log('Starting logout process...');
    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = this.getToken();
    
    console.log('Tokens before logout:', { refreshToken, accessToken });
    
    // Clear local storage immediately
    this.clearSession();
    
    // If we have tokens, try to call the logout API
    if (refreshToken && accessToken) {
      console.log('Calling logout API...');
      this.http.post(`${this.apiUrl}/Logout`, { refreshToken })
        .pipe(
          tap(() => console.log('Logout API call successful')),
          catchError(error => {
            console.error('Logout API error:', error);
            return of(null);
          }),
          finalize(() => {
            this.redirectToLogin();
          })
        )
        .subscribe();
    } else {
      console.log('No tokens found, just redirecting to login...');
      this.redirectToLogin();
    }
  }

  private redirectToLogin(): void {
    this.router.navigate(['/login'], { replaceUrl: true })
      .then(() => {
        console.log('Navigation to login complete, reloading page...');
        window.location.href = '/login';
      });
  }

  /* ================= LOGIN ================= */

  login(credentials: { Email: string; Password: string }): Observable<any> {
    console.log('Sending Login Payload:', credentials);
    return this.http.post(`${this.apiUrl}/Login`, credentials, { headers: { 'Content-Type': 'application/json' } }).pipe(
      tap((response: any) => {
        if (response?.accessToken) {
          this.setToken(response.accessToken);

          if (this.isBrowser && response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
          }

          this.router.navigate(['/home-for-patient']);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('SERVER VALIDATION ERROR:', error.error);
        console.log('Full Server Error:', error);
        return throwError(() => error);
      })
    );
  }

  /* ================= REGISTER ================= */

  signup(userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    rePassword: string;
  }): Observable<any> {
    const payload = {
      displayName: userData.name,
      email: userData.email,
      password: userData.password,
      phoneNumber: userData.phone
    };

    return this.http.post(`${this.apiUrl}/Register`, payload)
      .pipe(catchError(this.handleRegisterError));
  }

  /* ================= ERROR HANDLING ================= */

  private handleLoginError(error: HttpErrorResponse) {
    let message = 'Login failed';

    if (error.status === 401) {
      message = 'Invalid email or password';
    }

    return throwError(() => new Error(message));
  }

  private handleRegisterError(error: HttpErrorResponse) {
    let message = 'Registration failed';
    if (error.status === 409) {
      message = 'Email already exists';
    }
    return throwError(() => new Error(message));
  }
}
