import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { DashboardResponse } from '../../../shared/models/dashboard-response.interface';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DoctorDashboard {
  dashboardData: DashboardResponse = {
    totalAppointments: 0,
    confirmedAppointments: 0,
    cancelledAppointments: 0,
    availableTimeSlots: 0
  };
}
