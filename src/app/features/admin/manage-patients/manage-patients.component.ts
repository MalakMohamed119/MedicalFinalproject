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
import { PatientService } from '../../../core/services/patient.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { PatientProfileResponse } from '../../../shared/models/patient.interface';
import { AppointmentResponse } from '../../../shared/models/appointment-response.interface';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { formatAdminDate } from '../shared/admin-appointment.util';

type PatientViewTab = 'all' | 'bookings';

interface PatientBookingRow {
  patient: PatientProfileResponse;
  appointmentCount: number;
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
      appointments: this.appointmentService.getAllAppointments().pipe(catchError(() => of([] as AppointmentResponse[])))
    }).subscribe({
      next: ({ patients, appointments }) => {
        const patientList = Array.isArray(patients) ? patients : [];
        this.enrichPatients(patientList, appointments).subscribe({
          next: (enrichedPatients) => {
            this.rows.set(enrichedPatients.map((patient) => this.createRow(patient, appointments)));
            this.loading.set(false);
          },
          error: () => {
            this.rows.set(patientList.map((patient) => this.createRow(patient, appointments)));
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
    const user = (patient['user'] ?? patient['User'] ?? patient['applicationUser'] ?? patient['ApplicationUser'] ?? {}) as Record<string, unknown>;

    return String(
      patient.displayName ||
      patient.fullName ||
      patient.name ||
      user['displayName'] ||
      user['DisplayName'] ||
      user['fullName'] ||
      user['FullName'] ||
      user['name'] ||
      user['Name'] ||
      'Patient'
    );
  }

  patientEmail(patient: PatientProfileResponse): string {
    return this.getPatientText(patient, ['email', 'Email']);
  }

  patientPhone(patient: PatientProfileResponse): string {
    return this.getPatientText(patient, ['phoneNumber', 'PhoneNumber', 'phone', 'Phone']);
  }

  formatDate = formatAdminDate;

  patientDateOfBirth(patient: PatientProfileResponse): string {
    return formatAdminDate(this.getPatientText(patient, ['dateOfBirth', 'DateOfBirth']));
  }

  patientAge(patient: PatientProfileResponse): string {
    const dateOfBirth = this.getPatientText(patient, ['dateOfBirth', 'DateOfBirth']);

    if (!dateOfBirth) {
      return '-';
    }

    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) {
      return '-';
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();

    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return `${age} years`;
  }

  patientGender(patient: PatientProfileResponse): string {
    return this.getPatientText(patient, ['gender', 'Gender']) || '-';
  }

  patientAddress(patient: PatientProfileResponse): string {
    return this.getPatientText(patient, ['address', 'Address']) || '-';
  }

  patientAllergies(patient: PatientProfileResponse): string {
    const allergies = patient.allergies ?? patient['Allergies'];

    if (typeof allergies === 'string') {
      return allergies.trim();
    }

    if (Array.isArray(allergies)) {
      return allergies
        .map((item) => {
          const allergy = item as Record<string, unknown>;
          return allergy['name'] ?? allergy['Name'];
        })
        .filter(Boolean)
        .join(', ');
    }

    return '';
  }

  patientMedicalRecords(patient: PatientProfileResponse): string {
    const records = patient.medicalRecords ?? patient['MedicalRecords'];

    if (!Array.isArray(records)) {
      return '';
    }

    return records
      .map((item) => {
        const record = item as Record<string, unknown>;
        return [record['diagnosis'] ?? record['Diagnosis'], record['notes'] ?? record['Notes']]
          .filter(Boolean)
          .join(': ');
      })
      .filter(Boolean)
      .join(' | ');
  }

  private createRow(
    patient: PatientProfileResponse,
    appointments: AppointmentResponse[]
  ): PatientBookingRow {
    const patientAppointments = appointments.filter((appointment) =>
      this.matchesPatient(patient, appointment)
    );

    return {
      patient,
      appointmentCount: patientAppointments.length
    };
  }

  private enrichPatients(patients: PatientProfileResponse[], appointments: AppointmentResponse[]) {
    if (patients.length === 0) {
      return of([] as PatientProfileResponse[]);
    }

    return forkJoin(
      patients.map((patient) => {
        const identityUserId = this.getPatientIdentityUserId(patient, appointments);

        if (!identityUserId) {
          return of(patient);
        }

        return this.patientService.getDetailsByIdentityUserId(identityUserId).pipe(
          map((details) => ({ ...patient, ...details })),
          catchError(() => of(patient))
        );
      })
    );
  }

  private getPatientIdentityUserId(
    patient: PatientProfileResponse,
    appointments: AppointmentResponse[]
  ): string {
    const user = (patient['user'] ?? patient['User'] ?? patient['applicationUser'] ?? patient['ApplicationUser'] ?? {}) as Record<string, unknown>;
    const value =
      patient.identityUserId ??
      patient['IdentityUserId'] ??
      user['identityUserId'] ??
      user['IdentityUserId'] ??
      user['id'] ??
      user['Id'] ??
      patient.id;

    const directValue = String(value || '').trim();
    if (this.isUuidLike(directValue)) {
      return directValue;
    }

    const matchedAppointment = appointments.find((appointment) => this.matchesPatient(patient, appointment));
    return String(matchedAppointment?.patientId || directValue || '').trim();
  }

  private getPatientText(patient: PatientProfileResponse, keys: string[]): string {
    const user = (patient['user'] ?? patient['User'] ?? patient['applicationUser'] ?? patient['ApplicationUser'] ?? {}) as Record<string, unknown>;

    for (const key of keys) {
      const value = patient[key] ?? user[key];
      if (value !== null && value !== undefined && value !== '') {
        return String(value).trim();
      }
    }

    return '';
  }

  private isUuidLike(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value);
  }

  private matchesPatient(patient: PatientProfileResponse, appointment: AppointmentResponse): boolean {
    const user = (patient['user'] ?? patient['User'] ?? patient['applicationUser'] ?? patient['ApplicationUser'] ?? {}) as Record<string, unknown>;
    const patientKeys = [
      patient.id,
      patient.patientId,
      patient.identityUserId,
      patient.userName,
      patient.displayName,
      patient.fullName,
      patient.name,
      user['id'],
      user['Id'],
      user['identityUserId'],
      user['IdentityUserId'],
      user['userName'],
      user['UserName'],
      user['displayName'],
      user['DisplayName'],
      user['fullName'],
      user['FullName'],
      user['name'],
      user['Name']
    ]
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map((value) => String(value));

    const appointmentKeys = [appointment.patientId, appointment.patientName]
      .filter(Boolean)
      .map((value) => String(value));

    return patientKeys.some((key) => appointmentKeys.includes(key));
  }

}
