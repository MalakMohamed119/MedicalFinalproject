import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { AppointmentResponse } from '../../../shared/models/appointment-response.interface';

@Component({
  selector: 'app-timeslot-management',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  templateUrl: './timeslot-management.component.html',
  styleUrls: ['./timeslot-management.component.scss']
})
export class TimeslotManagement {
  appointments: AppointmentResponse[] = [];
}
