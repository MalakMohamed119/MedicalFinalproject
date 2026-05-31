import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { PatientFooterComponent } from '../../../shared/components/patient-footer/patient-footer.component';
import { DoctorFooterComponent } from '../../../shared/components/doctor-footer/doctor-footer.component';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { PatientService } from '../../../core/services/patient.service';
import { AppointmentResponse } from '../../../shared/models/appointment-response.interface';
import {
  PatientAllergy,
  PatientMedicalData,
  PatientMedicalRecord,
  PatientProfileResponse,
  PatientUpdateRequest
} from '../../../shared/models/patient.interface';

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
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PatientFooterComponent,
    DoctorFooterComponent,
    Navbar,
    RouterLink
  ],
  templateUrl: './patient-profile.html',
  styleUrl: './patient-profile.scss'
})
export class PatientProfile implements OnInit {

  private authService = inject(AuthService);
  private appointmentService = inject(AppointmentService);
  private patientService = inject(PatientService);
  private formBuilder = inject(FormBuilder);

  private currentPatient = signal<PatientProfileResponse | null>(null);
  patientId = signal<string | number | null>(null);
  patientName = signal<string>('');
  patientInitials = signal<string>('');
  age = signal<number>(0);
  gender = signal<string>('');
  bloodType = signal<string>('');
  userEmail = signal<string>('');
  phoneNumber = signal<string>('');
  address = signal<string>('');

  userRole = signal<string | null>(null);
  readonly isDoctor = computed(() => this.userRole() === 'Doctor');

  activeTab = signal<'upcoming' | 'past'>('upcoming');
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  notice = signal<string | null>(null);
  noticeType = signal<'success' | 'error'>('success');
  savingProfile = signal<boolean>(false);
  savingMedical = signal<boolean>(false);

  upcoming = signal<UpcomingAppointment[]>([]);
  past = signal<PastAppointment[]>([]);

  profileForm = this.formBuilder.group({
    displayName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.email]],
    phoneNumber: [''],
    age: [0],
    gender: [''],
    dateOfBirth: [''],
    address: ['', [Validators.required]],
    nationalId: ['']
  });

  medicalForm = this.formBuilder.group({
    allergies: this.formBuilder.array([this.createAllergyGroup()]),
    medicalRecords: this.formBuilder.array([this.createMedicalRecordGroup()])
  });

  get allergies(): FormArray {
    return this.medicalForm.get('allergies') as FormArray;
  }

  get medicalRecords(): FormArray {
    return this.medicalForm.get('medicalRecords') as FormArray;
  }

  ngOnInit(): void {
    this.userRole.set(this.authService.getRole());
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notice.set(null);

    this.patientService.getMyProfile().subscribe({
      next: (profile) => {
        this.loadProfileDetails(profile);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.loadAccountAsNewPatient();
          return;
        }

        this.loadAccountFallback();
      }
    });
  }

  private loadProfileDetails(profile: PatientProfileResponse): void {
    const details$ = this.patientService.getMyDetails().pipe(catchError(() => of(null)));
    const appointments$ = this.appointmentService.getPatientAppointments().pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 404) {
          this.showNotice('Failed to load appointments. Profile data is still available.', 'error');
        }

        return of([]);
      })
    );

    forkJoin({
      details: details$,
      appointments: appointments$
    }).subscribe({
      next: ({ details, appointments }) => {
        this.applyPatientData(profile, details as PatientProfileResponse | null);
        this.applyAppointments(appointments);
      },
      error: () => {
        this.applyPatientData(profile);
        this.applyAppointments([]);
      }
    });
  }

  private loadAccountAsNewPatient(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.patientId.set(null);
        this.applyPatientData(user as PatientProfileResponse);
        this.applyAppointments([]);
        this.showNotice('Complete your address, then save your profile to create your patient record.', 'error');
      },
      error: () => {
        this.error.set('Failed to load patient information');
        this.loading.set(false);
      }
    });
  }

  private loadAccountFallback(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.applyPatientData(user as PatientProfileResponse);
        this.applyAppointments([]);
      },
      error: () => {
        this.error.set('Failed to load patient information');
        this.loading.set(false);
      }
    });
  }

  private applyAppointments(appointments: AppointmentResponse[]): void {
    const { upcoming, past } = this.splitAppointments(appointments);
    this.upcoming.set(upcoming);
    this.past.set(past);
    this.loading.set(false);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.showNotice('Please check the highlighted profile fields.', 'error');
      return;
    }

    const payload = this.buildUpdatePayload();
    const id = this.patientId();
    const request$ = id
      ? this.patientService.updatePatient(id, payload)
      : this.patientService.createPatient(payload);

    this.savingProfile.set(true);
    request$
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: (response) => {
          this.applyPatientData(response, payload);
          this.showNotice('Profile updated successfully.', 'success');
        },
        error: (error) => {
          this.showNotice(this.getSaveErrorMessage(error), 'error');
        }
      });
  }

  saveMedicalData(): void {
    // Deduplicate form data before saving to prevent sending duplicates to API
    const allergies = this.deduplicateById(this.cleanMedicalRows<PatientAllergy>(this.allergies.getRawValue()));
    const medicalRecords = this.deduplicateById(this.cleanMedicalRows<PatientMedicalRecord>(this.medicalRecords.getRawValue()));

    // Update form with deduplicated data
    this.setAllergyRows(allergies);
    this.setMedicalRecordRows(medicalRecords);

    const payload = this.buildMedicalDataPayload();

    this.savingMedical.set(true);
    this.patientService
      .saveMyMedicalData(payload)
      .pipe(finalize(() => this.savingMedical.set(false)))
      .subscribe({
        next: (response) => {
          // Reload data from API to get the clean state
          this.loadData();
          this.showNotice('Medical data saved successfully.', 'success');
        },
        error: (error) => {
          this.showNotice(this.getSaveErrorMessage(error), 'error');
        }
      });
  }


  private applyPatientData(...sources: Array<PatientProfileResponse | null | undefined>): void {
    const merged: PatientProfileResponse = { ...(this.currentPatient() ?? {}) };

    for (const source of sources) {
      if (source) {
        Object.assign(merged, source);
      }
    }

    this.currentPatient.set(merged);

    const id = this.readValue(merged, ['id', 'patientId', 'identityUserId']);
    if (typeof id === 'string' || typeof id === 'number') {
      this.patientId.set(id);
    }

    const name = this.readString(merged, ['displayName', 'fullName', 'name']) || 'Unknown User';
    const email = this.readString(merged, ['email', 'userName']);
    const phone = this.readString(merged, ['phoneNumber', 'phone']);
    const age = this.readNumber(merged, ['age']);
    const gender = this.formatGender(this.readValue(merged, ['gender']));
    const bloodType = this.readString(merged, ['bloodType']);
    const address = this.readString(merged, ['address']);

    this.patientName.set(name);
    this.patientInitials.set(this.getInitials(name));
    this.userEmail.set(email);
    this.phoneNumber.set(phone);
    this.age.set(age);
    this.gender.set(gender);
    this.bloodType.set(bloodType);
    this.address.set(address);

    this.profileForm.patchValue({
      displayName: name === 'Unknown User' ? '' : name,
      email,
      phoneNumber: phone,
      age,
      gender,
      dateOfBirth: this.formatDateInput(this.readString(merged, ['dateOfBirth'])),
      address,
      nationalId: this.readString(merged, ['nationalId'])
    });

    this.medicalForm.patchValue({
      allergies: [],
      medicalRecords: []
    });

    const allergies = this.deduplicateById(this.normalizeAllergies(this.readValue(merged, ['allergies'])));
    const medicalRecords = this.deduplicateById(this.normalizeMedicalRecords(this.readValue(merged, ['medicalRecords'])));

    this.setAllergyRows(allergies);
    this.setMedicalRecordRows(medicalRecords);
  }

  addAllergy(): void {
    this.allergies.push(this.createAllergyGroup());
  }

  removeAllergy(index: number): void {
    if (this.allergies.length > 1) {
      this.allergies.removeAt(index);
    }
  }

  addMedicalRecord(): void {
    this.medicalRecords.push(this.createMedicalRecordGroup());
  }

  removeMedicalRecord(index: number): void {
    if (this.medicalRecords.length > 1) {
      this.medicalRecords.removeAt(index);
    }
  }

  private createAllergyGroup(allergy?: Partial<PatientAllergy>) {
    return this.formBuilder.group({
      id: [allergy?.id ?? 0],
      name: [allergy?.name ?? ''],
      description: [allergy?.description ?? '']
    });
  }

  private createMedicalRecordGroup(record?: Partial<PatientMedicalRecord>) {
    return this.formBuilder.group({
      id: [record?.id ?? 0],
      diagnosis: [record?.diagnosis ?? ''],
      notes: [record?.notes ?? '']
    });
  }

  private setAllergyRows(allergies: PatientAllergy[]): void {
    this.allergies.clear();

    if (allergies.length === 0) {
      this.allergies.push(this.createAllergyGroup());
    } else {
      allergies.forEach((allergy) => this.allergies.push(this.createAllergyGroup(allergy)));
    }
  }

  private setMedicalRecordRows(records: PatientMedicalRecord[]): void {
    this.medicalRecords.clear();

    if (records.length === 0) {
      this.medicalRecords.push(this.createMedicalRecordGroup());
    } else {
      records.forEach((record) => this.medicalRecords.push(this.createMedicalRecordGroup(record)));
    }
  }

  private deduplicateById<T extends { id?: number }>(items: T[]): T[] {
    // Deduplicate by content to prevent duplicates in UI
    const seenContent = new Map<string, T>();

    for (const item of items) {
      let contentKey: string;

      // For allergies, use name + description as key
      if ('name' in item && 'description' in item) {
        const allergy = item as { name?: string; description?: string };
        contentKey = `${allergy.name || ''}__${allergy.description || ''}`.toLowerCase().trim();
      }
      // For medical records, use diagnosis + notes as key
      else if ('diagnosis' in item && 'notes' in item) {
        const record = item as { diagnosis?: string; notes?: string };
        contentKey = `${record.diagnosis || ''}__${record.notes || ''}`.toLowerCase().trim();
      }
      else {
        contentKey = JSON.stringify(item);
      }

      // Keep the last occurrence of each unique content
      seenContent.set(contentKey, item);
    }

    return Array.from(seenContent.values());
  }

  private buildUpdatePayload(): PatientUpdateRequest {
    const profile = this.profileForm.getRawValue();

    return {
      fullName: String(profile.displayName || '').trim(),
      email: String(profile.email || '').trim(),
      phoneNumber: String(profile.phoneNumber || '').trim(),
      address: String(profile.address || '').trim(),
      allergies: this.cleanMedicalRows<PatientAllergy>(this.allergies.getRawValue()),
      medicalRecords: this.cleanMedicalRows<PatientMedicalRecord>(this.medicalRecords.getRawValue())
    };
  }

  private buildMedicalDataPayload(): PatientMedicalData {
    const allergies = this.cleanMedicalRows<PatientAllergy>(this.allergies.getRawValue());
    const medicalRecords = this.cleanMedicalRows<PatientMedicalRecord>(this.medicalRecords.getRawValue());

    return {
      allergies,
      medicalRecords
    };
  }


  private cleanMedicalRows<T extends object>(rows: unknown): T[] {
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row) => {
        const cleaned = Object.entries(row as Record<string, unknown>).reduce<Record<string, unknown>>(
          (result, [key, value]) => {
            if (key === 'id') {
              result[key] = Number(value) || 0;
              return result;
            }

            result[key] = typeof value === 'string' ? value.trim() : '';
            return result;
          },
          {}
        );

        return cleaned as T;
      })
      .filter((row) =>
        Object.entries(row as Record<string, unknown>).some(([key, value]) => key !== 'id' && !!value)
      );
  }

  private normalizeAllergies(value: unknown): PatientAllergy[] {
    if (Array.isArray(value)) {
      return value.map((item) => ({
        id: this.readOptionalNumber(item, 'id'),
        name: this.readObjectString(item, 'name'),
        description: this.readObjectString(item, 'description')
      }));
    }

    if (typeof value === 'string' && value.trim()) {
      return [{ id: 0, name: value.trim(), description: '' }];
    }

    return [];
  }

  private normalizeMedicalRecords(value: unknown): PatientMedicalRecord[] {
    if (Array.isArray(value)) {
      return value.map((item) => ({
        id: this.readOptionalNumber(item, 'id'),
        diagnosis: this.readObjectString(item, 'diagnosis'),
        notes: this.readObjectString(item, 'notes')
      }));
    }

    return [];
  }

  private readObjectString(source: unknown, key: string): string {
    if (!source || typeof source !== 'object') {
      return '';
    }

    const value = (source as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : '';
  }

  private readOptionalNumber(source: unknown, key: string): number {
    if (!source || typeof source !== 'object') {
      return 0;
    }

    const value = (source as Record<string, unknown>)[key];
    return typeof value === 'number' ? value : 0;
  }

  private readValue(source: PatientProfileResponse, keys: string[]): unknown {
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return null;
  }

  private readString(source: PatientProfileResponse, keys: string[]): string {
    const value = this.readValue(source, keys);

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return '';
  }

  private readNumber(source: PatientProfileResponse, keys: string[]): number {
    const value = this.readValue(source, keys);

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private formatGender(value: unknown): string {
    if (value === 1 || value === '1') {
      return 'Male';
    }

    if (value === 2 || value === '2') {
      return 'Female';
    }

    return typeof value === 'string' ? value : '';
  }

  private formatDateInput(value: string): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value.slice(0, 10);
    }

    return date.toISOString().slice(0, 10);
  }

  private showNotice(message: string, type: 'success' | 'error'): void {
    this.notice.set(message);
    this.noticeType.set(type);
  }

  private cleanPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
    return Object.entries(payload).reduce<Partial<T>>((cleaned, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        cleaned[key as keyof T] = value as T[keyof T];
      }

      return cleaned;
    }, {});
  }

  private getSaveErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'You are not allowed to update this profile. Please reload and try again.';
    }

    return error.error?.message ||
      error.error?.detail ||
      error.error?.title ||
      'Could not save your profile. Please try again.';
  }

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

      if (normalizedStatus === 'pending' || normalizedStatus === 'confirmed') {

        upcoming.push({
          id: appt.id,
          clinicName: `Clinic ${appt.clinicId}`,
          dateLabel,
          timeLabel
        });
      }

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

  private getInitials(displayName: string): string {
    const initials = displayName
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase())
      .join('');

    return initials || '?';
  }

  setTab(tab: 'upcoming' | 'past'): void {
    this.activeTab.set(tab);
  }

  cancelAppointment(id: number): void {

    this.appointmentService.cancelAppointment(id).subscribe({
      next: () => {

        const cancelled = this.upcoming()
          .find(a => a.id === id);

        const updatedUpcoming = this.upcoming()
          .filter(a => a.id !== id);

        this.upcoming.set(updatedUpcoming);

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
