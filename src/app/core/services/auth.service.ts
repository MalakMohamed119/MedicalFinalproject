import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly authUrl = `${environment.apiUrl}/auth/Clinic/Authentication`;

  constructor(private http: HttpClient) {}

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.authUrl}/Login`, credentials);
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.authUrl}/Register`, userData);
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
