import { Component, HostListener, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { ClinicResponse } from '../../../shared/models/clinic-response.interface';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';


export interface AdminStatCard {
  id: string;
  label: string;
  value: string;
  deltaLabel: string;
  deltaTone: 'positive' | 'negative' | 'neutral';
  icon: string;
}

import { DashboardResponse } from '../../../shared/models/dashboard-response.interface';
import { DoctorResponse } from '../../../shared/models/doctor-response.interface';


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly clinicService = inject(ClinicService);
  private readonly router = inject(Router);

  readonly sidebarOpen = signal(false);
  readonly stats = signal<AdminStatCard[]>([]);
  readonly clinics = signal<ClinicResponse[]>([]);
  readonly doctors = signal<DoctorResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  get currentUserEmail(): string {
    return localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).email || '' : '';
  }

  readonly starSlots = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    
    const role = this.authService.getRole();
    console.log('AdminDashboard role check:', role);
    if (role !== 'Admin') {
      this.router.navigate(['/login']);
      return;
    }

    this.loadDashboardData();
  }


  loadDashboardData(): void {
    this.loading.set(true);
    this.error.set('');

    this.clinicService.getAdminDashboard().subscribe({
      next: (dashboardStats: DashboardResponse) => {
        console.log('Stats Response:', dashboardStats);
        this.stats.set([
          {
            id: 'totalAppts',
            label: 'Total Appointments',
            value: (dashboardStats.todaysAppointments ?? 0).toString(),
            deltaLabel: '+12% this month',
            deltaTone: 'positive',
            icon: 'bi-calendar-event'
          },
          {
            id: 'confirmed',
            label: 'Confirmed Appointments',
            value: (dashboardStats.confirmedAppointments ?? 0).toString(),
            deltaLabel: '+8% vs yesterday',
            deltaTone: 'positive',
            icon: 'bi-check-circle'
          },
          {
            id: 'cancelled',
            label: 'Cancelled Appointments',
            value: (dashboardStats.cancelledAppointments ?? 0).toString(),
            deltaLabel: '-4% vs last week',
            deltaTone: 'negative',
            icon: 'bi-x-circle'
          },
          {
            id: 'slots',
            label: 'Available Time Slots',
            value: (dashboardStats.availableTimeSlots ?? 0).toString(),
            deltaLabel: '+15% this month',
            deltaTone: 'positive',
            icon: 'bi-clock'
          }
        ]);

        // Load doctors
        this.clinicService.getAllDoctors(0, 10).subscribe({
          next: (res: any) => {
            console.log('Doctors Received:', res);
            // Support both direct array and paginated result
            const doctorsList = Array.isArray(res) ? res : (res?.data || []);
            this.doctors.set(doctorsList);
            this.loading.set(false);
          },
          error: (err) => {
            console.error('Failed to load doctors:', err);
            this.error.set('Failed to load doctors');
            this.loading.set(false);
          }
        });

      },
      error: (err: any) => {
        this.error.set('Failed to load dashboard data');
        this.loading.set(false);
        console.error(err);
      }
    });

  }

  isStarFilled(rating: number, star: number): boolean {
    return star <= Math.round(rating);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleDoctorStatus(doctor: DoctorResponse): void {
    if (!doctor.id) return;
    const newActive = !doctor.isActive!;
    const request = newActive 
      ? this.clinicService.activateDoctor(doctor.id!) 
      : this.clinicService.deactivateDoctor(doctor.id!);

    request.subscribe({
      next: () => {
        this.doctors.update(doctors => 
          doctors.map(d => d.id === doctor.id ? { ...d, isActive: newActive } : d)
        );
      },
      error: (err) => {
        console.error('Toggle failed:', err);
        this.error.set('Failed to toggle doctor status');
      }
    });
  }

  deleteDoctor(doctor: DoctorResponse): void {
    if (doctor.email === this.currentUserEmail) {
      this.error.set('Cannot delete your own account');
      return;
    }
    if (!confirm(`Delete "${doctor.displayName || doctor.email}"?`)) return;

    this.clinicService.deleteUser(doctor.email).subscribe({
      next: () => {
        this.doctors.update(doctors => doctors.filter(d => d.id !== doctor.id));
      },
      error: (err) => {
        console.error('Delete failed:', err);
        this.error.set('Failed to delete doctor');
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.sidebarOpen()) {
      this.closeSidebar();
    }
  }
}

