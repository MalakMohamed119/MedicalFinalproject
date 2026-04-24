import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/Clinic/Authentication/Login`, credentials);
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/Clinic/Authentication/Register`, userData);
  }

  logout(): void {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }

  isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  }

  getRole(): string | null {
    if (typeof window === 'undefined') return null;
    const role = localStorage.getItem('role');
    console.log('Current User Role:', role);
    return role;
  }
}
