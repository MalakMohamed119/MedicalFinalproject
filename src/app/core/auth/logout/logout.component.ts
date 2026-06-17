import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logout',
  template: `
    <div class="logout-page">
      <div class="logout-card">
        <div class="logout-spinner" role="status" aria-label="Signing out"></div>
        <p class="logout-text">Signing out...</p>
      </div>
    </div>
  `,
  styleUrl: './logout.component.scss'
})
export class LogoutComponent implements OnInit {
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.logoutRequest().subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout()
    });
  }

  private finishLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

