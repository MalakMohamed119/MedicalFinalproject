import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar implements OnInit {
  userRole: string | null = null;

  get brandLink(): string {
    if (this.userRole === 'Admin') return '/admin-dashboard';
    if (this.userRole === 'Doctor') return '/doctor/dashboard';
    if (this.userRole) return '/home-for-patient';
    return '/login';
  }

  ngOnInit(): void {
    if (typeof localStorage === 'undefined') return;
    this.userRole = localStorage.getItem('role');
  }
}
