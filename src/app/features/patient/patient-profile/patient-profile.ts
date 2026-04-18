import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Footer } from '../../../shared/components/footer/footer';
import { Navbar } from '../../../shared/components/navbar/navbar';

export interface UpcomingAppointment {
  id: number;
  clinicName: string;
  dateLabel: string;
  timeLabel: string;
}

export interface PastAppointment {
  id: number;
  clinicName: string;
  dateLabel: string;
  doctorName: string;
}

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, Footer, Navbar],
  templateUrl: './patient-profile.html',
  styleUrl: './patient-profile.scss'
})
export class PatientProfile {
  readonly patientName = 'Layla Hassan';
  readonly patientInitials = 'LH';
  readonly age = 34;
  readonly gender = 'Female';
  readonly bloodType = 'A+';

  activeTab: 'upcoming' | 'past' = 'upcoming';

  readonly upcoming: UpcomingAppointment[] = [
    {
      id: 1,
      clinicName: 'Modern Dental Clinic',
      dateLabel: 'Thu, Apr 24, 2026',
      timeLabel: '10:30 AM'
    },
    {
      id: 2,
      clinicName: 'Heart & Soul Center',
      dateLabel: 'Mon, May 5, 2026',
      timeLabel: '2:00 PM'
    },
    {
      id: 3,
      clinicName: 'Global Eye Care',
      dateLabel: 'Wed, May 14, 2026',
      timeLabel: '11:15 AM'
    }
  ];

  readonly past: PastAppointment[] = [
    { id: 101, clinicName: 'Elite Medical Center', dateLabel: 'Mar 12, 2026', doctorName: 'Dr. Sara Ahmed' },
    { id: 102, clinicName: 'Prime Pediatrics', dateLabel: 'Feb 3, 2026', doctorName: 'Dr. Omar Khaled' },
    { id: 103, clinicName: 'Modern Dental Clinic', dateLabel: 'Jan 18, 2026', doctorName: 'Dr. Malak Mohamed' }
  ];

  setTab(tab: 'upcoming' | 'past'): void {
    this.activeTab = tab;
  }

  cancelAppointment(appt: UpcomingAppointment): void {
    console.log('Cancel requested:', appt.id);
  }
}
