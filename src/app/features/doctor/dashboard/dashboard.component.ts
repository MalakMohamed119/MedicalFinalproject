import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { DoctorFooterComponent } from '../../../shared/components/doctor-footer/doctor-footer.component';
import { DashboardResponse } from '../../../shared/models/dashboard-response.interface';
import { ClinicService } from '../../../core/services/clinic.service';


@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, DoctorFooterComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DoctorDashboard implements OnInit {
  private clinicService = inject(ClinicService);

  readonly dashboardData = signal<DashboardResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  retryLoad(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    console.log('Loading doctor dashboard...');
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (this.loading()) {
        console.warn('Safety timeout reached - stopping loading and showing fallback data');
        this.loading.set(false);
        this.error.set('Loading took too long. Showing default data.');
        this.dashboardData.set({
          totalAppointments: 0,
          confirmedAppointments: 0,
          cancelledAppointments: 0,
          availableTimeSlots: 0
        });
      }
    }, 15000); // 15 seconds safety timeout
    
    this.clinicService.getDoctorDashboard().subscribe({
      next: (data: DashboardResponse) => {
        clearTimeout(safetyTimeout); // Clear safety timeout on success
        console.log('Dashboard data loaded:', data);
        this.dashboardData.set(data);
        this.loading.set(false);
      },
      error: (err: any) => {
        clearTimeout(safetyTimeout); // Clear safety timeout on error
        console.error('Dashboard error:', err);
        this.error.set('Failed to load dashboard. Please try again.');
        this.loading.set(false);
        this.dashboardData.set({
          totalAppointments: 0,
          confirmedAppointments: 0,
          cancelledAppointments: 0,
          availableTimeSlots: 0
        });
      }
    });
  }
}


