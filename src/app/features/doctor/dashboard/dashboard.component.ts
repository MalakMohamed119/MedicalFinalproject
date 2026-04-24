import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { DashboardResponse } from '../../../shared/models/dashboard-response.interface';
import { ClinicService } from '../../../core/services/clinic.service';


@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DoctorDashboard implements OnInit {
  private clinicService = inject(ClinicService);

  dashboardData: DashboardResponse | null = null;
  loading = true;

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.clinicService.getDoctorDashboard().subscribe({
      next: (data: DashboardResponse) => {
        this.dashboardData = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Dashboard error:', err);
        this.loading = false;
      }
    });
  }
}


