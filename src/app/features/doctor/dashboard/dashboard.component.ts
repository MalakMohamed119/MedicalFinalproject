import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardResponse } from '../../../shared/models/dashboard-response.interface';
import { ClinicService } from '../../../core/services/clinic.service';
import { AuthService } from '../../../core/services/auth.service';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { DoctorFooterComponent } from '../../../shared/components/doctor-footer/doctor-footer.component';
import { formatAppError } from '../../../shared/utils/error-message.util';

interface DashboardStats {
  appointments: number;
  confirmed: number;
  cancelled: number;
  slots: number;
}

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, DoctorFooterComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DoctorDashboard implements OnInit {
  private clinicService = inject(ClinicService);
  private authService = inject(AuthService);

  readonly stats = signal<DashboardStats>({
    appointments: 0,
    confirmed: 0,
    cancelled: 0,
    slots: 0
  });
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly doctorName = signal<string>('Doctor');

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user: { displayName?: string }) => {
        if (user?.displayName) {
          this.doctorName.set(user.displayName);
        }
      },
      error: () => {
        // keep default
      }
    });

    this.loadDashboard();
  }

  retryLoad(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    const safetyTimeout = setTimeout(() => {
      if (this.loading()) {
        this.loading.set(false);
        this.error.set('Loading took too long. Showing default data.');
        this.stats.set({
          appointments: 0,
          confirmed: 0,
          cancelled: 0,
          slots: 0
        });
      }
    }, 15000);

    this.clinicService.getDoctorDashboard().subscribe({
      next: (data: DashboardResponse) => {
        clearTimeout(safetyTimeout);
        this.stats.set({
          appointments: data.totalAppointments || 0,
          confirmed: data.confirmedAppointments || 0,
          cancelled: data.cancelledAppointments || 0,
          slots: data.availableTimeSlots || 0
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        clearTimeout(safetyTimeout);
        console.error('Dashboard error:', err);
        this.error.set(formatAppError(err, 'Failed to load dashboard. Please try again.'));
        this.loading.set(false);
        this.stats.set({
          appointments: 0,
          confirmed: 0,
          cancelled: 0,
          slots: 0
        });
      }
    });
  }
}
