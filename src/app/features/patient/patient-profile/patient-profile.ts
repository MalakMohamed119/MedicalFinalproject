import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientFooterComponent } from '../../../shared/components/patient-footer/patient-footer.component';
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
  imports: [CommonModule, PatientFooterComponent, Navbar],
  templateUrl: './patient-profile.html',
  styleUrl: './patient-profile.scss'
})
export class PatientProfile implements OnInit {

  private authService = inject(AuthService);
  private appointmentService = inject(AppointmentService);

  // =========================
  // USER INFO SIGNALS
  // =========================

  patientName = signal<string>('');
  patientInitials = signal<string>('');
  age = signal<number>(0);
  gender = signal<string>('');
  bloodType = signal<string>('');

  // =========================
  // UI STATE
  // =========================

  activeTab = signal<'upcoming' | 'past'>('upcoming');
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // =========================
  // APPOINTMENTS STATE
  // =========================

  upcoming = signal<UpcomingAppointment[]>([]);
  past = signal<PastAppointment[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  // =========================
  // LOAD ALL DATA
  // =========================

  loadData(): void {

    this.loading.set(true);
    this.error.set(null);

    // USER INFO
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.patientName.set(user.displayName || 'Unknown User');
        this.patientInitials.set(this.getInitials(user.displayName || ''));
        this.age.set(user.age || 0);
        this.gender.set(user.gender || '');
        this.bloodType.set(user.bloodType || '');
      },
      error: () => {
        this.error.set('Failed to load user information');
      }
    });

    // APPOINTMENTS
    this.appointmentService.getPatientAppointments().subscribe({
      next: (appointments: AppointmentResponse[]) => {

        const { upcoming, past } = this.splitAppointments(appointments);

        this.upcoming.set(upcoming);
        this.past.set(past);

        this.loading.set(false);
      },

      error: () => {
        this.error.set('Failed to load appointments');
        this.loading.set(false);
      }
    });
  }

  // =========================
  // SPLIT LOGIC (FIXED CORE)
  // =========================

  private splitAppointments(appointments: AppointmentResponse[]) {

    const upcoming: UpcomingAppointment[] = [];
    const past: PastAppointment[] = [];

    appointments.forEach(appt => {

      const date = new Date(appt.date);

      const dateLabel = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const timeLabel = `${appt.startTime} - ${appt.endTime}`;

      const normalizedStatus = String(appt.status).toLowerCase();

      // UPCOMING
      if (normalizedStatus === 'pending' || normalizedStatus === 'confirmed') {

        upcoming.push({
          id: appt.id,
          clinicName: `Clinic ${appt.clinicId}`,
          dateLabel,
          timeLabel
        });
      }

      // PAST (IMPORTANT FIX: includes cancelled + completed)
      if (normalizedStatus === 'cancelled' || normalizedStatus === 'completed') {

        past.push({
          id: appt.id,
          clinicName: `Clinic ${appt.clinicId}`,
          dateLabel,
          doctorName: 'Doctor Name',
          status: String(appt.status)
        });
      }
    });

    return { upcoming, past };
  }

  // =========================
  // INITIALS
  // =========================

  private getInitials(displayName: string): string {
    return displayName
      .split(' ')
      .map(w => w.charAt(0).toUpperCase())
      .join('');
  }

  // =========================
  // TAB SWITCH
  // =========================

  setTab(tab: 'upcoming' | 'past'): void {
    this.activeTab.set(tab);
  }

  // =========================
  // CANCEL APPOINTMENT (LIVE UPDATE FIX)
  // =========================

  cancelAppointment(id: number): void {

    this.appointmentService.cancelAppointment(id).subscribe({
      next: () => {

        // 🔥 INSTANT UI UPDATE (no reload needed)

        // move to past - get from original upcoming data before filtering
        const cancelled = this.upcoming()
          .find(a => a.id === id);

        // remove from upcoming
        const updatedUpcoming = this.upcoming()
          .filter(a => a.id !== id);

        this.upcoming.set(updatedUpcoming);

        // safer: rebuild past by refetching minimal data
        const currentPast = this.past();

        if (cancelled) {

          this.past.set([
            ...currentPast,
            {
              id: cancelled.id,
              clinicName: cancelled.clinicName,
              dateLabel: cancelled.dateLabel,
              doctorName: 'Doctor Name',
              status: 'Cancelled'
            }
          ]);
        }
      },

      error: () => {
        this.error.set('Failed to cancel appointment');
      }
    });
  }
}