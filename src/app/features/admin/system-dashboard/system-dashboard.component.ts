import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';

@Component({
  selector: 'app-system-dashboard',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  templateUrl: './system-dashboard.component.html',
  styleUrls: ['./system-dashboard.component.scss']
})
export class SystemDashboard {
  stats = { totalDoctors: 0, totalClinics: 0, totalAppointments: 0 };
}
