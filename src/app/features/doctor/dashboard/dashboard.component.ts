import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { DashboardResponse } from '../../../shared/models/dashboard-response.interface';
import { ClinicService } from '../../../core/services/clinic.service';


@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, Footer],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DoctorDashboard implements OnInit {
  private clinicService = inject(ClinicService);

  dashboardData: DashboardResponse | null = null;
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.loadDashboard();
  }

  retryLoad(): void {
    console.log('Retrying dashboard load...');
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading = true;
    this.error = null;
    console.log('Loading doctor dashboard...');
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (this.loading) {
        console.warn('Safety timeout reached - stopping loading and showing fallback data');
        this.loading = false;
        this.error = 'Loading took too long. Showing default data.';
        this.dashboardData = {
          totalAppointments: 0,
          confirmedAppointments: 0,
          cancelledAppointments: 0,
          availableTimeSlots: 0
        };
      }
    }, 15000); // 15 seconds safety timeout
    
    this.clinicService.getDoctorDashboard().subscribe({
      next: (data: DashboardResponse) => {
        clearTimeout(safetyTimeout); // Clear safety timeout on success
        console.log('Dashboard data loaded:', data);
        this.dashboardData = data;
        this.loading = false;
      },
      error: (err: any) => {
        clearTimeout(safetyTimeout); // Clear safety timeout on error
        console.error('Dashboard error:', err);
        this.error = 'Failed to load dashboard. Please try again.';
        this.loading = false;
        // Provide default data so the page shows something
        this.dashboardData = {
          totalAppointments: 0,
          confirmedAppointments: 0,
          cancelledAppointments: 0,
          availableTimeSlots: 0
        };
      }
    });
  }
}


