import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { DashboardResponse } from '../../../shared/models/dashboard-response.interface';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

interface DashboardStats {
  appointments: number;
  confirmed: number;
  cancelled: number;
  slots: number;
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

  readonly stats = signal<DashboardStats>({
    appointments: 0,
    confirmed: 0,
    cancelled: 0,
    slots: 0
  });
  readonly loading = signal(true);
  readonly error = signal('');

  readonly mainNavItems: NavItem[] = [
    { label: 'Dashboard', icon: 'fa-gauge-high', route: '' }
  ];

  readonly manageNavItems: NavItem[] = [
    { label: 'Manage Doctors', icon: 'fa-user-doctor', route: '' },
    { label: 'Add Doctor', icon: 'fa-user-plus', route: '' }
  ];

  ngOnInit(): void {
    const role = this.authService.getRole();
    if (!role || role !== 'Admin') {
      this.router.navigate(['/login']);
      return;
    }
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set('');

    this.clinicService.getAdminDashboard().subscribe({
      next: (data: DashboardResponse) => {
        this.stats.set({
          appointments: data.totalAppointments || 0,
          confirmed: data.confirmedAppointments || 0,
          cancelled: data.cancelledAppointments || 0,
          slots: data.availableTimeSlots || 0
        });
        this.loading.set(false);
      },
      error: (err: any) => {
        if (err.status === 401) {
          this.error.set('Authentication failed. Please log in again.');
          this.authService.logout();
          this.router.navigate(['/login']);
        } else if (err.status === 403) {
          this.error.set('Access denied. You do not have admin privileges.');
        } else {
          this.error.set('Failed to load dashboard data. Please try again.');
        }
        this.loading.set(false);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

