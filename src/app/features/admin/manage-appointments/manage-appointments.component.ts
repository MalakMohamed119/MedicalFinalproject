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
import { catchError } from 'rxjs/operators';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { PatientService } from '../../../core/services/patient.service';
import { AppointmentResponse } from '../../../shared/models/appointment-response.interface';
import { ClinicResponse } from '../../../shared/models/clinic-response.interface';
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

    forkJoin({
      clinics: this.clinicService.getAllClinics({ pageIndex: 0, pageSize: 1000 }).pipe(
        catchError(() => of([] as ClinicResponse[]))
      ),
      patients: this.patientService.getAllPatients().pipe(catchError(() => of([] as PatientProfileResponse[])))
    }).subscribe({
      next: ({ clinics: clinicsResponse, patients }) => {
        const clinics = Array.isArray(clinicsResponse)
          ? clinicsResponse
          : ((clinicsResponse as { data?: ClinicResponse[] })?.data ?? []);

        const clinicMap = new Map<number, ClinicResponse>(
          clinics.map((clinic) => [clinic.id, clinic])
        );
        const patientMap = this.buildPatientMap(patients);

        this.appointmentService.getAllAppointments().subscribe({
          next: (appointments) => {
            if (appointments.length > 0 || clinics.length === 0) {
              this.renderAppointments(appointments, clinicMap, patientMap);
              return;
            }

            this.loadAppointmentsFromClinics(clinics, clinicMap, patientMap);
          },
          error: () => {
            if (clinics.length === 0) {
              this.error.set('Failed to load appointments.');
              this.loading.set(false);
              return;
            }

            this.loadAppointmentsFromClinics(clinics, clinicMap, patientMap);
          }
        });
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

  private loadAppointmentsFromClinics(
    clinics: ClinicResponse[],
    clinicMap: Map<number, ClinicResponse>,
    patientMap: Map<string, PatientProfileResponse>
  ): void {
    const requests = clinics.map((clinic) =>
      this.appointmentService.getClinicAppointments(clinic.id).pipe(catchError(() => of([])))
    );

    forkJoin(requests).subscribe({
      next: (groups) => {
        this.renderAppointments(groups.flat(), clinicMap, patientMap);
      },
      error: () => {
        this.error.set('Failed to load appointments.');
        this.loading.set(false);
      }
    });
  }

  private renderAppointments(
    appointments: AppointmentResponse[],
    clinicMap: Map<number, ClinicResponse>,
    patientMap: Map<string, PatientProfileResponse>
  ): void {
    const rows = appointments.map((appointment) =>
      this.enrichAppointment(appointment, clinicMap, patientMap)
    );

    rows.sort((a, b) => this.compareAppointments(a, b));
    this.appointments.set(rows);
    this.loading.set(false);
  }

  private enrichAppointment(
    appointment: AppointmentResponse,
    clinicMap: Map<number, ClinicResponse>,
    patientMap: Map<string, PatientProfileResponse>
  ): AdminAppointmentRow {
    const clinic = clinicMap.get(Number(appointment.clinicId));
    const patient = this.findPatient(appointment, patientMap);
    const statusLabel = normalizeAppointmentStatus(appointment.status);

    return {
      ...appointment,
      status: statusLabel,
      statusLabel,
      clinicName: appointment.clinicName || clinic?.clinicName,
      clinicNameResolved: appointment.clinicName || clinic?.clinicName || 'Clinic',
      patientNameResolved:
        appointment.patientName ||
        patient?.displayName ||
        patient?.fullName ||
        patient?.name ||
        'Patient'
    };
  }

  private buildPatientMap(patients: PatientProfileResponse[]): Map<string, PatientProfileResponse> {
    const map = new Map<string, PatientProfileResponse>();

    for (const patient of patients) {
      const keys = [
        patient.id,
        patient.patientId,
        patient.identityUserId,
        patient.userName
      ]
        .filter((value) => value !== null && value !== undefined && value !== '')
        .map((value) => String(value));

      for (const key of keys) {
        map.set(key, patient);
      }
    }

    return map;
  }

  private findPatient(
    appointment: AppointmentResponse,
    patientMap: Map<string, PatientProfileResponse>
  ): PatientProfileResponse | undefined {
    const keys = [appointment.patientId, appointment.patientName]
      .filter(Boolean)
      .map((value) => String(value));

    for (const key of keys) {
      const patient = patientMap.get(key);
      if (patient) {
        return patient;
      }
    }

    return undefined;
  }

  private compareAppointments(a: AdminAppointmentRow, b: AdminAppointmentRow): number {
    const dateA = a.date ? new Date(a.date.includes('T') ? a.date : `${a.date}T00:00:00`).getTime() : 0;
    const dateB = b.date ? new Date(b.date.includes('T') ? b.date : `${b.date}T00:00:00`).getTime() : 0;

    if (dateA !== dateB) {
      return dateB - dateA;
    }

    return String(b.startTime || '').localeCompare(String(a.startTime || ''));
  }
}
