import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Navbar } from '../../../shared/components/navbar/navbar';
import { DoctorFooterComponent } from '../../../shared/components/doctor-footer/doctor-footer.component';

import { AppointmentService } from '../../../core/services/appointment.service';
import { ClinicService } from '../../../core/services/clinic.service';

import { timeout } from 'rxjs/operators';
import { TimeoutError } from 'rxjs';

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    Navbar,
    DoctorFooterComponent
  ],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class DoctorAppointments implements OnInit {

  appointments: any[] = [];

  loading: boolean = false;

  error: string | null = null;

  updatingAppointmentId: number | null = null;

  activeTab: 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' = 'all';

  constructor(
    private appointmentService: AppointmentService,
    private clinicService: ClinicService,
    private cdr: ChangeDetectorRef
  ) {}

  // =========================================
  // DERIVED APPOINTMENTS
  // =========================================

  get allAppointments(): any[] {
    return this.appointments;
  }

  get pendingAppointments(): any[] {
    return this.appointments.filter(a => a.status === 'Pending');
  }

  get confirmedAppointments(): any[] {
    return this.appointments.filter(a => a.status === 'Confirmed');
  }

  get completedAppointments(): any[] {
    return this.appointments.filter(a => a.status === 'Completed');
  }

  get cancelledAppointments(): any[] {
    return this.appointments.filter(a => a.status === 'Cancelled');
  }

  // =========================================
  // TAB NAVIGATION
  // =========================================

  setTab(tab: 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'): void {
    this.activeTab = tab;
  }

  // =========================================
  // INIT
  // =========================================

  ngOnInit(): void {
    this.loadAllPatientAppointments();
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
  // LOAD ALL PATIENT APPOINTMENTS
  // =========================================

  async loadAllPatientAppointments(): Promise<void> {

    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.appointmentService
      .getAllPatientAppointments()
      .pipe(timeout(10000))
      .subscribe({

        next: async (data: any[]) => {

          // Get appointments with basic info first
          const basicAppointments = data.map(a => ({

            ...a,

            status: this.getStatusString(a.status),

            clinicName: a.clinicName ?? `Clinic ${a.clinicId}`,

            patientName: a.patientName ?? 'Patient'
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

        error: (err: any) => {

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
  // UPDATE APPOINTMENT STATUS
  // =========================================

  updateAppointmentStatus(appointmentId: number, newStatus: string): void {

    const confirmed = confirm(`Are you sure you want to change this appointment status to ${newStatus}?`);

    if (!confirmed) return;

    this.updatingAppointmentId = appointmentId;
    this.cdr.detectChanges();

    this.appointmentService.updateAppointmentStatus(appointmentId, newStatus)
      .subscribe({

        next: () => {

          // Update the appointment status in the local array
          this.appointments = this.appointments.map(a => {

            if (a.id === appointmentId) {
              return {
                ...a,
                status: newStatus
              };
            }

            return a;
          });

          this.updatingAppointmentId = null;
          this.cdr.detectChanges();
        },

        error: () => {

          this.error = 'Failed to update appointment status. Please try again.';
          this.updatingAppointmentId = null;
          this.cdr.detectChanges();
        }
      });
  }

  // =========================================
  // STATUS MAPPING
  // =========================================

  getStatusString(status: number | string): string {

    if (typeof status === 'number') {

      switch (status) {
        case 0: return 'Pending';
        case 1: return 'Confirmed';
        case 2: return 'Completed';
        case 3: return 'Cancelled';
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

    const date = new Date(dateString + 'T00:00:00');

    if (isNaN(date.getTime())) return 'Invalid Date';

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

      default: return 'status-default';
    }
  }
}
