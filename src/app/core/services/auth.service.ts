import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly authUrl = `${environment.apiUrl}/auth/Clinic/Authentication`;
  private readonly doctorAuthUrl = `${environment.doctorAuthUrl}/Clinic/Authentication`;

  constructor(private http: HttpClient) {}

  login(credentials: any): Observable<any> {
    // Try main auth service first (8082 with /auth/)
    return this.http.post(`${this.authUrl}/Login`, credentials).pipe(
      catchError((error) => {
        // If main endpoint fails with connection error, try doctor endpoint (8080 without /auth/)
        if (error.status === 0 || error.status >= 500) {
          return this.http.post(`${this.doctorAuthUrl}/Login`, credentials);
        }
        return throwError(() => error);
      })
    );
  }

  register(userData: any): Observable<any> {
    // Try main auth service first (8082 with /auth/)
    return this.http.post(`${this.authUrl}/Register`, userData).pipe(
      catchError((error) => {
        // If main endpoint fails with connection error, try doctor endpoint (8080 without /auth/)
        if (error.status === 0 || error.status >= 500) {
          return this.http.post(`${this.doctorAuthUrl}/Register`, userData);
        }
        return throwError(() => error);
      })
    );
  }

  emailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.authUrl}/EmailExists`, { params: { email } });
  }

  logout(): void {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }

  logoutRequest(): Observable<any> {
    return this.http.post(`${this.authUrl}/Logout`, {});
  }

  refresh(refreshToken: string): Observable<any> {
    return this.http.post(`${this.authUrl}/Refresh`, { refreshToken });
  }

  isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  }

  getRole(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('role');
  }

  getCurrentUserId(): string {
    if (typeof window === 'undefined') return '';

    const token = localStorage.getItem('token');
    if (!token) return '';

    try {
      const payloadSegment = token.split('.')[1] || '';
      const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
      const payload = JSON.parse(atob(paddedBase64)) as Record<string, unknown>;
      const id =
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
        payload['nameid'] ||
        payload['sub'];

      return typeof id === 'string' ? id : '';
    } catch {
      return '';
    }
  }

  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.authUrl}/CurrentUser`);
  }

  deleteUser(email: string): Observable<void> {
    return this.http.delete<void>(`${this.authUrl}/DeleteUser`, { params: { email } });
  }

  updateUser(id: string | number, data: any): Observable<any> {
    return this.http.patch(`${this.authUrl}/UpdateUser/${id}`, data);
  }

  updatePassword(id: string | number, data: any): Observable<any> {
    return this.http.patch(`${this.authUrl}/UpdatePassword/${id}`, data);
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.authUrl}/AllUsers`);
  }

  getUserById(id: string | number): Observable<any> {
    return this.http.get(`${this.authUrl}/UserById/${id}`);
  }
}
