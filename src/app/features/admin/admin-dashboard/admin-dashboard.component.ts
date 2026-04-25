import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { DashboardResponse } from '../../../shared/models/dashboard-response.interface';

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

  readonly stats = signal<StatCard[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

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
        this.stats.set([
          {
            label: 'Total Appointments',
            value: data.totalAppointments || 0,
            color: '#2563eb',
            icon: 'fa-calendar-days'
          },
          {
            label: 'Confirmed Appointments',
            value: data.confirmedAppointments || 0,
            color: '#16a34a',
            icon: 'fa-circle-check'
          },
          {
            label: 'Cancelled Appointments',
            value: data.cancelledAppointments || 0,
            color: '#dc2626',
            icon: 'fa-circle-xmark'
          },
          {
            label: 'Available Time Slots',
            value: data.availableTimeSlots || 0,
            color: '#7c3aed',
            icon: 'fa-clock'
          }
        ]);
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
