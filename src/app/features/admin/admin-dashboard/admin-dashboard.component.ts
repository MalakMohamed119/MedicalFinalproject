import { Component, signal, inject, OnInit, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { DashboardResponse } from '../../../shared/models/dashboard-response.interface';
import { jwtDecode } from 'jwt-decode';

interface StatCard {
  label: string;
  value: number;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private clinicService = inject(ClinicService);
  private router = inject(Router);

  readonly sidebarOpen = signal(false);
  readonly stats = signal<StatCard[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    const role = this.authService.getRole();
    console.log('Admin Dashboard - Current Role:', role);
    console.log('Admin Dashboard - Is Admin:', role === 'Admin');

    // Debug JWT token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        console.log('Admin Dashboard - JWT Token Claims:', decoded);
        console.log('Admin Dashboard - Token Role Claims:', {
          role: decoded.role,
          msRole: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
          roleAlt: decoded['role']
        });
      } catch (e) {
        console.error('Admin Dashboard - Failed to decode JWT:', e);
      }
    } else {
      console.log('Admin Dashboard - No token found in localStorage');
    }

    if (!role || role !== 'Admin') {
      console.log('Admin Dashboard - Redirecting to login: not admin');
      this.router.navigate(['/login']);
      return;
    }

    console.log('Admin Dashboard - Loading dashboard data...');
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set('');

    this.clinicService.getAdminDashboard().subscribe({
      next: (data: DashboardResponse) => {
        this.stats.set([
          {
            label: 'Total Appointments',
            value: data.totalAppointments || 0,
            color: '#2563eb', // blue
            icon: 'bi-calendar-check'
          },
          {
            label: 'Confirmed Appointments',
            value: data.confirmedAppointments || 0,
            color: '#16a34a', // green
            icon: 'bi-check-circle'
          },
          {
            label: 'Cancelled Appointments',
            value: data.cancelledAppointments || 0,
            color: '#dc2626', // red
            icon: 'bi-x-circle'
          },
          {
            label: 'Available Time Slots',
            value: data.availableTimeSlots || 0,
            color: '#7c3aed', // purple
            icon: 'bi-clock'
          }
        ]);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Dashboard load error:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Error details:', err.error);

        if (err.status === 403) {
          this.error.set('Access denied. You do not have admin privileges.');
        } else if (err.status === 401) {
          this.error.set('Authentication failed. Please log in again.');
          this.authService.logout();
          this.router.navigate(['/login']);
        } else {
          this.error.set('Failed to load dashboard data');
        }
        this.loading.set(false);
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeSidebar();
  }
}
