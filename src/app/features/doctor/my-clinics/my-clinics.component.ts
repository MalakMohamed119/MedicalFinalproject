import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { DoctorFooterComponent } from '../../../shared/components/doctor-footer/doctor-footer.component';
import { ClinicResponse } from '../../../shared/models/clinic-response.interface';
import { AppointmentResponse } from '../../../shared/models/appointment-response.interface';
import { ClinicService } from '../../../core/services/clinic.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { PatientService } from '../../../core/services/patient.service';
import { PatientProfileResponse } from '../../../shared/models/patient.interface';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-my-clinics',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Navbar, DoctorFooterComponent],
  templateUrl: './my-clinics.component.html',
  styleUrls: ['./my-clinics.component.scss']
})
export class MyClinics implements OnInit, OnDestroy {
  private clinicService = inject(ClinicService);
  private appointmentService = inject(AppointmentService);
  private patientService = inject(PatientService);
  private fb = inject(FormBuilder);
  private document = inject(DOCUMENT);

  readonly clinics = signal<ClinicResponse[]>([]);
  readonly loading = signal(false);
  readonly showAddForm = signal(false);
  readonly editingClinic = signal<ClinicResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly viewingClinic = signal<ClinicResponse | null>(null);
  
  // Appointments related signals
  readonly showingAppointments = signal<ClinicResponse | null>(null);
  readonly clinicAppointments = signal<AppointmentResponse[]>([]);
  readonly appointmentsLoading = signal(false);
  readonly appointmentsError = signal<string | null>(null);

  clinicForm: FormGroup = this.fb.group({
    clinicName: ['', [Validators.required]],
    clinicAddress: ['', [Validators.required]],
    description: ['']
  });

  ngOnInit(): void {
    this.loadMyClinics();
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('clinic-modal-open');
  }

  loadMyClinics(): void {
    this.loading.set(true);
    this.error.set(null);

    this.clinicService.getMyClinics().subscribe({
      next: (data) => {
        this.clinics.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading clinics:', err);
        this.error.set('Failed to load clinics. Please try again.');
        this.loading.set(false);
      }
    });
  }

  showAddClinicForm(): void {
    this.showAddForm.set(true);
    this.editingClinic.set(null);
    this.clinicForm.reset();
    this.error.set(null);
    this.success.set(null);
  }

  editClinic(clinic: ClinicResponse): void {
    this.showAddForm.set(true);
    this.editingClinic.set(clinic);
    this.clinicForm.patchValue({
      clinicName: clinic.clinicName,
      clinicAddress: clinic.clinicAddress,
      description: clinic.description
    });
    this.error.set(null);
    this.success.set(null);
  }

  viewClinic(clinic: ClinicResponse): void {
    this.viewingClinic.set(clinic);
    this.document.body.classList.add('clinic-modal-open');
  }

  closeViewClinic(): void {
    this.viewingClinic.set(null);
    this.document.body.classList.remove('clinic-modal-open');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.viewingClinic()) {
      this.closeViewClinic();
    }
  }

  cancelEdit(): void {
    this.showAddForm.set(false);
    this.editingClinic.set(null);
    this.clinicForm.reset();
    this.error.set(null);
    this.success.set(null);
  }

  saveClinic(): void {
    if (this.clinicForm.invalid) {
      this.error.set('Please fill in all required fields');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const formData = this.clinicForm.value;
    const editing = this.editingClinic();

    if (editing) {
      this.clinicService.updateClinic(editing.id, formData).subscribe({
        next: () => {
          this.success.set('Clinic updated successfully!');
          this.loadMyClinics();
          this.cancelEdit();
        },
        error: (err) => {
          this.error.set('Failed to update clinic. Please try again.');
          this.loading.set(false);
        }
      });
    } else {
      this.clinicService.createClinic(formData).subscribe({
        next: () => {
          this.success.set('Clinic created successfully!');
          this.loadMyClinics();
          this.cancelEdit();
        },
        error: (err) => {
          this.error.set('Failed to create clinic. Please try again.');
          this.loading.set(false);
        }
      });
    }
  }

  deleteClinic(clinic: ClinicResponse): void {
    if (confirm(`Are you sure you want to delete "${clinic.clinicName}"?`)) {
      this.loading.set(true);
      this.clinicService.deleteClinic(clinic.id).subscribe({
        next: () => {
          this.success.set('Clinic deleted successfully!');
          this.loadMyClinics();
        },
        error: (err) => {
          this.error.set('Failed to delete clinic. Please try again.');
          this.loading.set(false);
        }
      });
    }
  }

  clearMessages(): void {
    this.error.set(null);
    this.success.set(null);
  }

  // Appointments methods
  viewClinicAppointments(clinic: ClinicResponse): void {
    this.showingAppointments.set(clinic);
    this.loadClinicAppointments(clinic.id);
  }

  loadClinicAppointments(clinicId: number): void {
    this.appointmentsLoading.set(true);
    this.appointmentsError.set(null);

    forkJoin({
      appointments: this.appointmentService.getClinicAppointmentsWithResolvedStatuses(clinicId),
      patients: this.patientService.getAllPatients().pipe(catchError(() => of([] as PatientProfileResponse[])))
    }).subscribe({
      next: ({ appointments, patients }) => {
        const patientMap = this.buildPatientMap(patients);
        const basicAppointments = appointments.map((appointment) => ({
          ...appointment,
          status: this.getStatusString(appointment.status),
          patientName:
            this.resolvePatientName(appointment, patientMap) ||
            this.getDisplayPatientName(appointment.patientName) ||
            'Unknown Patient'
        }));

        if (basicAppointments.length === 0) {
          this.clinicAppointments.set([]);
          this.appointmentsLoading.set(false);
          return;
        }

        forkJoin(
          basicAppointments.map((appointment) => {
            if (!this.shouldLoadPatientDetails(appointment)) {
              return of(appointment);
            }

            return this.getPatientForAppointment(appointment).pipe(
              map((patient) => ({
                ...appointment,
                patientName: this.extractPatientName(patient) || appointment.patientName,
                patientDetails: this.extractPatientDetails(patient)
              })),
              catchError(() => of(appointment))
            );
          })
        ).subscribe({
          next: (enrichedAppointments) => {
            this.clinicAppointments.set(enrichedAppointments);
            this.appointmentsLoading.set(false);
          },
          error: () => {
            this.clinicAppointments.set(basicAppointments);
            this.appointmentsLoading.set(false);
          }
        });
      },
      error: (err: any) => {
        console.error('Error loading clinic appointments:', err);
        this.appointmentsError.set('Failed to load appointments. Please try again.');
        this.appointmentsLoading.set(false);
      }
    });
  }

  closeAppointmentsView(): void {
    this.showingAppointments.set(null);
    this.clinicAppointments.set([]);
    this.appointmentsError.set(null);
  }

  updateAppointmentStatus(appointmentId: number, status: string): void {
    const current = this.clinicAppointments().find((appointment) => appointment.id === appointmentId);

    if (status === 'Completed' && current?.status !== 'Confirmed') {
      this.error.set('Appointment must be confirmed before it can be completed.');
      return;
    }

    this.appointmentService.updateAppointmentStatus(appointmentId, status).subscribe({
      next: () => {
        console.log('Appointment status updated successfully');
        const currentClinic = this.showingAppointments();
        if (currentClinic) {
          this.loadClinicAppointments(currentClinic.id);
        }
      },
      error: (err: any) => {
        console.error('Error updating appointment status:', err);
        this.error.set('Failed to update appointment status.');
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) {
      return 'N/A';
    }

    const rawDate = String(dateString);
    const date = rawDate.includes('T')
      ? new Date(rawDate)
      : new Date(`${rawDate}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(timeString: string): string {
    if (!timeString) {
      return 'N/A';
    }

    const rawTime = String(timeString);
    const parsedDate = new Date(rawTime);

    if (!Number.isNaN(parsedDate.getTime()) && rawTime.includes('T')) {
      return parsedDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    const parts = rawTime.split(':');

    if (parts.length < 2) {
      return 'N/A';
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return 'N/A';
    }

    const time = new Date();
    time.setHours(hours, minutes, 0, 0);

    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

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

    // Convert status number to string
    if (typeof status === 'number') {
      switch (status) {
        case 0: return 'Pending';
        case 1: return 'Confirmed';
        case 2: return 'Rejected';
        case 3: return 'Completed';
        case 4: return 'NoShow';
        default: return 'Unknown';
      }
    }
    // If it's already a string, return as is
    return status;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'status-confirmed';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
      case 'rejected':
        return 'status-cancelled';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-default';
    }
  }

  private needsPatientNameLookup(appointment: AppointmentResponse): boolean {
    const name = this.getDisplayPatientName(appointment.patientName);
    return Boolean(appointment.patientId || appointment.id) && (!name || /^unknown patient$/i.test(name) || /^patient$/i.test(name) || this.isIdentifierLike(name));
  }

  private shouldLoadPatientDetails(appointment: AppointmentResponse): boolean {
    return Boolean(appointment.patientId || this.needsPatientNameLookup(appointment));
  }

  private getPatientForAppointment(appointment: AppointmentResponse) {
    const identityUserId = this.getDisplayPatientName(appointment.patientId);

    if (identityUserId) {
      return this.patientService.getDetailsByIdentityUserId(identityUserId).pipe(
        catchError(() => this.appointmentService.getAppointmentPatient(appointment.id))
      );
    }

    return this.appointmentService.getAppointmentPatient(appointment.id);
  }

  private extractPatientName(patient: any): string {
    const source = patient?.data ?? patient?.Data ?? patient;

    if (typeof source === 'string') {
      return this.getDisplayPatientName(source);
    }

    const user = source?.user ?? source?.User ?? source?.applicationUser ?? source?.ApplicationUser ?? {};
    const fullName = [
      source?.firstName ?? source?.FirstName,
      source?.lastName ?? source?.LastName
    ]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' ');

    return this.getDisplayPatientName(
      source?.displayName ??
      source?.DisplayName ??
      source?.fullName ??
      source?.FullName ??
      source?.name ??
      source?.Name ??
      source?.patientName ??
      source?.PatientName ??
      user?.displayName ??
      user?.DisplayName ??
      user?.fullName ??
      user?.FullName ??
      user?.name ??
      user?.Name ??
      fullName
    );
  }

  private extractPatientDetails(patient: any): any {
    const source = patient?.data ?? patient?.Data ?? patient;

    if (!source || typeof source !== 'object') {
      return null;
    }

    return source;
  }

  getPatientDetail(appointment: any, key: string): string {
    const details = appointment?.patientDetails ?? {};
    const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
    return this.getDisplayPatientName(details[key] ?? details[pascalKey]);
  }

  getPatientDateOfBirth(appointment: any): string {
    const value = this.getPatientDetail(appointment, 'dateOfBirth');
    return value ? this.formatDate(value) : '';
  }

  getPatientAllergies(appointment: any): string {
    const details = appointment?.patientDetails ?? {};
    const allergies = details.allergies ?? details.Allergies;

    if (typeof allergies === 'string') {
      return allergies.trim();
    }

    if (Array.isArray(allergies)) {
      return allergies
        .map((item) => item?.name ?? item?.Name)
        .filter(Boolean)
        .join(', ');
    }

    return '';
  }

  hasPatientDetails(appointment: any): boolean {
    return Boolean(
      this.getPatientDetail(appointment, 'address') ||
      this.getPatientDateOfBirth(appointment) ||
      this.getPatientDetail(appointment, 'gender') ||
      this.getPatientAllergies(appointment)
    );
  }

  private getDisplayPatientName(value: unknown): string {
    return String(value || '').trim();
  }

  private isIdentifierLike(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value) || /^\d+$/.test(value);
  }

  private buildPatientMap(patients: PatientProfileResponse[]): Map<string, PatientProfileResponse> {
    const map = new Map<string, PatientProfileResponse>();

    for (const patient of patients) {
      const user = (patient['user'] ?? patient['User'] ?? patient['applicationUser'] ?? patient['ApplicationUser'] ?? {}) as Record<string, unknown>;
      const keys = [
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

      for (const key of keys) {
        map.set(key, patient);
      }
    }

    return map;
  }

  private resolvePatientName(
    appointment: AppointmentResponse,
    patientMap: Map<string, PatientProfileResponse>
  ): string {
    const keys = [appointment.patientId, appointment.patientName]
      .filter(Boolean)
      .map((value) => String(value));

    for (const key of keys) {
      const patient = patientMap.get(key);
      const name = patient ? this.getPatientDisplayName(patient) : '';
      if (name) {
        return name;
      }
    }

    return '';
  }

  private getPatientDisplayName(patient: PatientProfileResponse): string {
    const user = (patient['user'] ?? patient['User'] ?? patient['applicationUser'] ?? patient['ApplicationUser'] ?? {}) as Record<string, unknown>;

    return this.getDisplayPatientName(
      patient.displayName ||
      patient.fullName ||
      patient.name ||
      user['displayName'] ||
      user['DisplayName'] ||
      user['fullName'] ||
      user['FullName'] ||
      user['name'] ||
      user['Name']
    );
  }
}
