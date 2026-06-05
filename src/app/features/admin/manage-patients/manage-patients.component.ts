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
import { PatientService } from '../../../core/services/patient.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { PatientProfileResponse } from '../../../shared/models/patient.interface';
import { AppointmentResponse } from '../../../shared/models/appointment-response.interface';
import { ClinicResponse } from '../../../shared/models/clinic-response.interface';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import {
  AppointmentStatusLabel,
  formatAdminDate,
  getAppointmentStatusClass,
  normalizeAppointmentStatus
} from '../shared/admin-appointment.util';

type PatientViewTab = 'all' | 'bookings';

interface PatientBookingRow {
  patient: PatientProfileResponse;
  appointmentCount: number;
  latestStatus: AppointmentStatusLabel | '—';
  latestDate: string;
  latestClinic: string;
}

@Component({
  selector: 'app-manage-patients',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent],
  templateUrl: './manage-patients.component.html',
  styleUrl: './manage-patients.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManagePatientsComponent implements OnInit {
  private patientService = inject(PatientService);
  private clinicService = inject(ClinicService);
  private appointmentService = inject(AppointmentService);

  readonly rows = signal<PatientBookingRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly activeTab = signal<PatientViewTab>('all');

  readonly visibleRows = computed(() => {
    const tab = this.activeTab();
    const allRows = this.rows();

    if (tab === 'bookings') {
      return allRows.filter((row) => row.appointmentCount > 0);
    }

    return allRows;
  });

  readonly bookingCount = computed(() =>
    this.rows().filter((row) => row.appointmentCount > 0).length
  );

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      patients: this.patientService.getAllPatients().pipe(catchError(() => of([] as PatientProfileResponse[]))),
      clinics: this.clinicService.getAllClinics({ pageIndex: 0, pageSize: 1000 }).pipe(
        catchError(() => of([] as ClinicResponse[]))
      )
    }).subscribe({
      next: ({ patients, clinics: clinicsResponse }) => {
        const clinicList = Array.isArray(clinicsResponse)
          ? clinicsResponse
          : ((clinicsResponse as { data?: ClinicResponse[] })?.data ?? []);

        if (clinicList.length === 0) {
          this.rows.set(
            (Array.isArray(patients) ? patients : []).map((patient) => this.createRow(patient, []))
          );
          this.loading.set(false);
          return;
        }

        const requests = clinicList.map((clinic) =>
          this.appointmentService.getClinicAppointments(clinic.id).pipe(catchError(() => of([])))
        );

        forkJoin(requests).subscribe({
          next: (groups) => {
            const appointments = groups.flat().map((appointment) => {
              const clinic = clinicList.find((item) => item.id === Number(appointment.clinicId));
              return {
                ...appointment,
                clinicName: appointment.clinicName || clinic?.clinicName || 'Clinic'
              };
            });

            const patientList = Array.isArray(patients) ? patients : [];
            this.rows.set(patientList.map((patient) => this.createRow(patient, appointments)));
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Failed to load patient bookings.');
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.error.set('Failed to load patients.');
        this.loading.set(false);
      }
    });
  }

  setTab(tab: PatientViewTab): void {
    this.activeTab.set(tab);
  }

  displayName(patient: PatientProfileResponse): string {
    return patient.displayName || patient.fullName || patient.name || 'Patient';
  }

  formatDate = formatAdminDate;

  getRowStatusClass(status: AppointmentStatusLabel | '—'): string {
    if (status === '—') {
      return 'status-default';
    }

    return getAppointmentStatusClass(status);
  }

  private createRow(
    patient: PatientProfileResponse,
    appointments: AppointmentResponse[]
  ): PatientBookingRow {
    const patientAppointments = appointments.filter((appointment) =>
      this.matchesPatient(patient, appointment)
    );

    patientAppointments.sort((a, b) => this.compareAppointments(a, b));
    const latest = patientAppointments[0];

    return {
      patient,
      appointmentCount: patientAppointments.length,
      latestStatus: latest ? normalizeAppointmentStatus(latest.status) : '—',
      latestDate: latest ? formatAdminDate(latest.date) : '—',
      latestClinic: latest?.clinicName || '—'
    };
  }

  private matchesPatient(patient: PatientProfileResponse, appointment: AppointmentResponse): boolean {
    const patientKeys = [patient.id, patient.patientId, patient.identityUserId, patient.userName]
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map((value) => String(value));

    const appointmentKeys = [appointment.patientId, appointment.patientName]
      .filter(Boolean)
      .map((value) => String(value));

    return patientKeys.some((key) => appointmentKeys.includes(key));
  }

  private compareAppointments(a: AppointmentResponse, b: AppointmentResponse): number {
    const dateA = a.date ? new Date(a.date.includes('T') ? a.date : `${a.date}T00:00:00`).getTime() : 0;
    const dateB = b.date ? new Date(b.date.includes('T') ? b.date : `${b.date}T00:00:00`).getTime() : 0;
    return dateB - dateA;
  }
}
