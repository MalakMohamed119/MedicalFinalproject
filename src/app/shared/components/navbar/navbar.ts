import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  providers: [AuthService]
})
export class Navbar {
  userRole: string = 'carehome';
  private authService = inject(AuthService);
  private router = inject(Router);

  onLogout(): void {
    console.log('Logout clicked');
    try {
      this.authService.logout();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}