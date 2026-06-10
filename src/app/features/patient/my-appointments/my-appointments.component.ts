import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Navbar } from '../../../shared/components/navbar/navbar';
import { PatientFooterComponent } from '../../../shared/components/patient-footer/patient-footer.component';

import { AppointmentService } from '../../../core/services/appointment.service';
import { ClinicService } from '../../../core/services/clinic.service';

import { timeout } from 'rxjs/operators';
import { TimeoutError } from 'rxjs';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    Navbar,
    PatientFooterComponent
  ],
  templateUrl: './my-appointments.component.html',
  styleUrls: ['./my-appointments.component.scss']
})
export class MyAppointments implements OnInit {

  appointments: any[] = [];

  loading: boolean = false;

  error: string | null = null;

  cancellingAppointmentId: number | null = null;

  pendingCancelAppointmentId: number | null = null;

  activeTab: 'upcoming' | 'past' = 'upcoming';

  constructor(
    private appointmentService: AppointmentService,
    private clinicService: ClinicService,
    private cdr: ChangeDetectorRef
  ) {}

  // =========================================
  // DERIVED APPOINTMENTS (IMPORTANT FIX)
  // =========================================

  get upcomingAppointments(): any[] {
    return this.appointments.filter(a =>
      a.status === 'Pending' || a.status === 'Confirmed'
    );
  }

  get pastAppointments(): any[] {
    return this.appointments.filter(a =>
      a.status === 'Completed' || a.status === 'Cancelled' || a.status === 'Rejected' || a.status === 'NoShow'
    );
  }

  // =========================================
  // TAB NAVIGATION
  // =========================================

  setTab(tab: 'upcoming' | 'past'): void {
    this.activeTab = tab;
  }

  // =========================================
  // INIT
  // =========================================

  ngOnInit(): void {
    this.loadPatientAppointments();
  }

  // =========================================
  // GET CLINIC NAME BY ID
  // =========================================

  getClinicNameById(clinicId: number): Promise<string> {
    return new Promise((resolve) => {
      this.clinicService.getClinicsById(clinicId).subscribe({
        next: (clinic) => {
          resolve(clinic.clinicName || `Clinic ${clinicId}`);
        },
        error: () => {
          resolve(`Clinic ${clinicId}`);
        }
      });
    });
  }

  // =========================================
  // LOAD APPOINTMENTS
  // =========================================

  async loadPatientAppointments(): Promise<void> {

    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.appointmentService
      .getPatientAppointments()
      .pipe(timeout(10000))
      .subscribe({

        next: async (data: any[]) => {

          // Get appointments with basic info first
          const basicAppointments = data.map(a => ({

            ...a,

            status: this.getStatusString(a.status),

            clinicName: a.clinicName ?? `Clinic ${a.clinicId}`,

            patientName: a.patientName ?? 'Current Patient'
          }));

          // Fetch clinic names for appointments that have clinicId but no clinicName
          const appointmentsWithClinicNames = await Promise.all(
            basicAppointments.map(async (appointment) => {
              if (appointment.clinicId && !appointment.clinicName || appointment.clinicName.includes(`Clinic ${appointment.clinicId}`)) {
                const clinicName = await this.getClinicNameById(appointment.clinicId);
                return {
                  ...appointment,
                  clinicName: clinicName
                };
              }
              return appointment;
            })
          );

          this.appointments = appointmentsWithClinicNames;
          this.loading = false;
          this.cdr.detectChanges();
        },

        error: (err) => {

          if (err instanceof TimeoutError) {
            this.error = 'Request timed out. Try again.';
          } else if (err.status === 404) {
            this.error = 'No appointments found.';
          } else if (err.status === 401) {
            this.error = 'Please log in again.';
          } else {
            this.error = `Failed to load appointments (${err.status ?? 'unknown'}).`;
          }

          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  // =========================================
  // CANCEL APPOINTMENT (FIXED BEHAVIOR)
  // =========================================

  cancelAppointment(appointmentId: number): void {
    this.pendingCancelAppointmentId = appointmentId;
  }

  closeCancelConfirm(): void {
    this.pendingCancelAppointmentId = null;
  }

  confirmCancelAppointment(): void {
    const appointmentId = this.pendingCancelAppointmentId;

    if (!appointmentId) return;

    this.pendingCancelAppointmentId = null;

    this.cancellingAppointmentId = appointmentId;
    this.cdr.detectChanges();

    this.appointmentService.cancelAppointment(appointmentId)
      .subscribe({

        next: () => {

          // IMPORTANT: update status instead of moving manually
          this.appointments = this.appointments.map(a => {

            if (a.id === appointmentId) {
              return {
                ...a,
                status: 'Cancelled'
              };
            }

            return a;
          });

          this.cancellingAppointmentId = null;
          this.cdr.detectChanges();
        },

        error: () => {

          this.error = 'Failed to cancel appointment. Please try again.';
          this.cancellingAppointmentId = null;
          this.cdr.detectChanges();
        }
      });
  }

  // =========================================
  // STATUS MAPPING
  // =========================================

  getStatusString(status: number | string): string {
    if (typeof status === 'string') {
      const numericStatus = Number(status);
      if (Number.isFinite(numericStatus) && status.trim() !== '') {
        return this.getStatusString(numericStatus);
      }

      switch (status.trim().toLowerCase()) {
        case 'pending':
          return 'Pending';
        case 'confirmed':
          return 'Confirmed';
        case 'cancelled':
        case 'canceled':
          return 'Cancelled';
        case 'rejected':
          return 'Rejected';
        case 'completed':
          return 'Completed';
        case 'noshow':
        case 'no show':
        case 'no-show':
          return 'NoShow';
        default:
          return status;
      }
    }

    if (typeof status === 'number') {

      switch (status) {
        case 0: return 'Pending';
        case 1: return 'Confirmed';
        case 2: return 'Cancelled';
        case 3: return 'Completed';
        case 4: return 'NoShow';
        default: return 'Unknown';
      }
    }

    return status;
  }

  // =========================================
  // FORMAT DATE
  // =========================================

  formatDate(dateString: string): string {

    if (!dateString) return 'N/A';

    const date = dateString.includes('T')
      ? new Date(dateString)
      : new Date(dateString + 'T00:00:00');

    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // =========================================
  // FORMAT TIME
  // =========================================

  formatTime(timeString: string): string {

    if (!timeString) return 'N/A';

    const parsedDate = new Date(timeString);
    if (!Number.isNaN(parsedDate.getTime()) && timeString.includes('T')) {
      return parsedDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    const parts = timeString.split(':');

    if (parts.length < 2) return 'N/A';

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return 'N/A';

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // =========================================
  // STATUS CLASS
  // =========================================

  getStatusClass(status: string): string {

    switch ((status || '').toLowerCase()) {

      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      case 'rejected': return 'status-rejected';
      case 'noshow': return 'status-noshow';

      default: return 'status-default';
    }
  }

  isCancelling(appointmentId: number): boolean {
    return this.cancellingAppointmentId === appointmentId;
  }
}
