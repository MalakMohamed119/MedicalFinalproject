import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Footer } from '../../../shared/components/footer/footer';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AppointmentResponse } from '../../../shared/models/appointment-response.interface';

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
  status: string;
}

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, Footer, Navbar],
  templateUrl: './patient-profile.html',
  styleUrl: './patient-profile.scss'
})
export class PatientProfile implements OnInit {
  private authService = inject(AuthService);
  private appointmentService = inject(AppointmentService);

  // Signals for state management
  patientName = signal<string>('');
  patientInitials = signal<string>('');
  age = signal<number>(0);
  gender = signal<string>('');
  bloodType = signal<string>('');

  activeTab = signal<'upcoming' | 'past'>('upcoming');
  upcoming = signal<UpcomingAppointment[]>([]);
  past = signal<PastAppointment[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load user info
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.patientName.set(user.displayName || 'Unknown User');
        this.patientInitials.set(this.getInitials(user.displayName || ''));
        this.age.set(user.age || 0);
        this.gender.set(user.gender || '');
        this.bloodType.set(user.bloodType || '');
      },
      error: (err) => {
        console.error('Error loading user:', err);
        this.error.set('Failed to load user information');
      }
    });

    // Load appointments
    this.appointmentService.getPatientAppointments().subscribe({
      next: (appointments: AppointmentResponse[]) => {
        const { upcoming, past } = this.splitAppointments(appointments);
        this.upcoming.set(upcoming);
        this.past.set(past);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
        this.error.set('Failed to load appointments');
        this.loading.set(false);
      }
    });
  }

  private splitAppointments(appointments: AppointmentResponse[]): { upcoming: UpcomingAppointment[], past: PastAppointment[] } {
    const upcoming: UpcomingAppointment[] = [];
    const past: PastAppointment[] = [];

    appointments.forEach(appt => {
      const date = new Date(appt.date);
      const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const timeLabel = `${appt.startTime} - ${appt.endTime}`;

      if (appt.status === 'Pending' || appt.status === 'Confirmed') {
        upcoming.push({
          id: appt.id,
          clinicName: `Clinic ${appt.clinicId}`, // Assuming clinic name not in response, adjust as needed
          dateLabel,
          timeLabel
        });
      } else if (appt.status === 'Cancelled' || appt.status === 'Completed') {
        past.push({
          id: appt.id,
          clinicName: `Clinic ${appt.clinicId}`,
          dateLabel,
          doctorName: 'Doctor Name', // Assuming not in response, adjust as needed
          status: appt.status
        });
      }
    });

    return { upcoming, past };
  }

  private getInitials(displayName: string): string {
    return displayName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }

  setTab(tab: 'upcoming' | 'past'): void {
    this.activeTab.set(tab);
  }

  cancelAppointment(id: number): void {
    this.appointmentService.cancelAppointment(id).subscribe({
      next: () => {
        console.log('Appointment cancelled:', id);
        this.loadData(); // Reload data
      },
      error: (err) => {
        console.error('Error cancelling appointment:', err);
        this.error.set('Failed to cancel appointment');
      }
    });
  }
}
