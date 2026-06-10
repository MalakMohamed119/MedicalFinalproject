import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { PatientService } from '../../../core/services/patient.service';
import { AppointmentResponse } from '../../../shared/models/appointment-response.interface';
import { PatientProfileResponse } from '../../../shared/models/patient.interface';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import {
  AppointmentStatusFilter,
  AppointmentStatusLabel,
  formatAdminDate,
  formatAdminTime,
  getAppointmentStatusClass,
  matchesStatusFilter,
  normalizeAppointmentStatus
} from '../shared/admin-appointment.util';

type AdminAppointmentRow = AppointmentResponse & {
  statusLabel: AppointmentStatusLabel;
  clinicNameResolved: string;
  patientNameResolved: string;
};

@Component({
  selector: 'app-manage-appointments',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent],
  templateUrl: './manage-appointments.component.html',
  styleUrl: './manage-appointments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageAppointmentsComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private clinicService = inject(ClinicService);
  private patientService = inject(PatientService);

  readonly appointments = signal<AdminAppointmentRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly statusFilter = signal<AppointmentStatusFilter>('all');

  readonly filteredAppointments = computed(() => {
    const filter = this.statusFilter();
    return this.appointments().filter((appointment) =>
      matchesStatusFilter(appointment.statusLabel, filter)
    );
  });

  readonly statusCounts = computed(() => {
    const rows = this.appointments();
    return {
      all: rows.length,
      pending: rows.filter((row) => row.statusLabel === 'Pending').length,
      confirmed: rows.filter((row) => row.statusLabel === 'Confirmed').length,
      completed: rows.filter((row) => row.statusLabel === 'Completed').length,
      cancelled: rows.filter(
        (row) =>
          row.statusLabel === 'Cancelled' ||
          row.statusLabel === 'Rejected' ||
          row.statusLabel === 'NoShow'
      ).length
    };
  });

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading.set(true);
    this.error.set('');

    this.appointmentService.getAllAppointments().subscribe({
      next: (appointments) => {
        this.renderAppointments(appointments);
      },
      error: () => {
        this.error.set('Failed to load appointments.');
        this.loading.set(false);
      }
    });
  }

  setStatusFilter(filter: AppointmentStatusFilter): void {
    this.statusFilter.set(filter);
  }

  formatDate = formatAdminDate;
  formatTime = formatAdminTime;
  getStatusClass = getAppointmentStatusClass;

  private renderAppointments(appointments: AppointmentResponse[]): void {
    const rows = appointments.map((appointment) =>
      this.enrichAppointment(appointment)
    );

    rows.sort((a, b) => this.compareAppointments(a, b));
    this.resolveAppointmentNames(rows).subscribe({
      next: (resolvedRows) => {
        this.appointments.set(resolvedRows);
        this.loading.set(false);
      },
      error: () => {
        this.appointments.set(rows);
        this.loading.set(false);
      }
    });
  }

  private enrichAppointment(appointment: AppointmentResponse): AdminAppointmentRow {
    const statusLabel = normalizeAppointmentStatus(appointment.status);
    const appointmentPatientName = appointment.patientName && !this.isIdentifierLike(appointment.patientName)
      ? appointment.patientName
      : undefined;

    return {
      ...appointment,
      status: statusLabel,
      statusLabel,
      clinicName: appointment.clinicName,
      clinicNameResolved: appointment.clinicName || 'Clinic',
      patientNameResolved: appointmentPatientName || 'Patient'
    };
  }

  private resolveAppointmentNames(rows: AdminAppointmentRow[]) {
    return forkJoin({
      patients: this.resolvePatientNameMap(rows),
      clinics: this.resolveClinicNameMap(rows)
    }).pipe(
      map(({ patients, clinics }) =>
        rows.map((row) => ({
          ...row,
          patientNameResolved: patients.get(row.patientId) || row.patientNameResolved,
          clinicNameResolved: clinics.get(row.clinicId) || row.clinicNameResolved
        }))
      )
    );
  }

  private resolvePatientNameMap(rows: AdminAppointmentRow[]) {
    const patientIds = Array.from(
      new Set(
        rows
          .filter((row) => row.patientNameResolved === 'Patient' && this.isIdentifierLike(row.patientId))
          .map((row) => row.patientId)
      )
    );

    if (patientIds.length === 0) {
      return of(new Map<string, string>());
    }

    return forkJoin(
      patientIds.map((patientId) =>
        this.patientService.getDetailsByIdentityUserId(patientId).pipe(
          map((patient) => ({ patientId, name: this.extractPatientName(patient) })),
          catchError(() => of({ patientId, name: '' }))
        )
      )
    ).pipe(
      map((patients) =>
        new Map(
          patients
            .filter((patient) => patient.name)
            .map((patient) => [patient.patientId, patient.name])
        )
      )
    );
  }

  private resolveClinicNameMap(rows: AdminAppointmentRow[]) {
    const clinicIds = Array.from(
      new Set(
        rows
          .filter((row) => row.clinicNameResolved === 'Clinic' && Number(row.clinicId) > 0)
          .map((row) => Number(row.clinicId))
      )
    );

    if (clinicIds.length === 0) {
      return of(new Map<number, string>());
    }

    return forkJoin(
      clinicIds.map((clinicId) =>
        this.clinicService.getClinicsById(clinicId).pipe(
          map((clinic) => ({ clinicId, name: String(clinic.clinicName || '').trim() })),
          catchError(() => of({ clinicId, name: '' }))
        )
      )
    ).pipe(
      map((clinics) =>
        new Map(
          clinics
            .filter((clinic) => clinic.name)
            .map((clinic) => [clinic.clinicId, clinic.name])
        )
      )
    );
  }

  private extractPatientName(patient: PatientProfileResponse): string {
    const user = (patient['user'] ?? patient['User'] ?? patient['applicationUser'] ?? patient['ApplicationUser'] ?? {}) as Record<string, unknown>;
    const fullName = [
      patient['firstName'] ?? patient['FirstName'],
      patient['lastName'] ?? patient['LastName']
    ]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' ');

    return String(
      patient.fullName ||
      patient.displayName ||
      patient.name ||
      user['fullName'] ||
      user['FullName'] ||
      user['displayName'] ||
      user['DisplayName'] ||
      user['name'] ||
      user['Name'] ||
      fullName ||
      ''
    ).trim();
  }

  private isIdentifierLike(value: unknown): boolean {
    const text = String(value || '').trim();

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text);
  }

  private compareAppointments(a: AdminAppointmentRow, b: AdminAppointmentRow): number {
    const valueA = a.date || a.appointmentDate || a.startTime;
    const valueB = b.date || b.appointmentDate || b.startTime;
    const dateA = valueA ? new Date(String(valueA).includes('T') ? valueA : `${valueA}T00:00:00`).getTime() : 0;
    const dateB = valueB ? new Date(String(valueB).includes('T') ? valueB : `${valueB}T00:00:00`).getTime() : 0;

    if (dateA !== dateB) {
      return dateB - dateA;
    }

    return String(b.startTime || '').localeCompare(String(a.startTime || ''));
  }
}
