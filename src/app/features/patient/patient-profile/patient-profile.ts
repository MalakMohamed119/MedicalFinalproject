import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { PatientFooterComponent } from '../../../shared/components/patient-footer/patient-footer.component';
import { DoctorFooterComponent } from '../../../shared/components/doctor-footer/doctor-footer.component';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { PatientService } from '../../../core/services/patient.service';
import { AppointmentResponse } from '../../../shared/models/appointment-response.interface';
import {
  PatientAllergy,
  PatientCreateRequest,
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
  status: string;
  sortValue: number;
}

export interface PastAppointment {
  id: number;
  clinicName: string;
  dateLabel: string;
  doctorName: string;
  status: string;
  sortValue: number;
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
  private clinicService = inject(ClinicService);
  private patientService = inject(PatientService);
  private formBuilder = inject(FormBuilder);

  private currentPatient = signal<PatientProfileResponse | null>(null);
  patientId = signal<string | number | null>(null);
  patientName = signal<string>('');
  patientInitials = signal<string>('');
  age = signal<number | null>(null);
  gender = signal<string>('');
  bloodType = signal<string>('');
  userEmail = signal<string>('');
  phoneNumber = signal<string>('');
  address = signal<string>('');

  userRole = signal<string | null>(null);
  readonly normalizedRole = computed(() =>
    String(this.userRole() || '')
      .trim()
      .replace(/^["']|["']$/g, '')
      .toLowerCase()
  );
  readonly isDoctor = computed(() => this.normalizedRole().includes('doctor'));

  activeTab = signal<'upcoming' | 'past'>('upcoming');
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  notice = signal<string | null>(null);
  noticeType = signal<'success' | 'error'>('success');
  savingProfile = signal<boolean>(false);
  savingMedical = signal<boolean>(false);
  hasSavedPatientProfile = signal<boolean>(false);
  readonly profileActionLabel = computed(() =>
    this.hasSavedPatientProfile() ? 'Update profile' : 'Save profile'
  );
  readonly ageLabel = computed(() =>
    this.age() !== null && this.age() !== undefined ? String(this.age()) : '—'
  );
  private appointmentsLoaded = false;
  private deletedMedicalRecordIds = new Set<number>();
  private deletedAllergyIds = new Set<number>();

  upcoming = signal<UpcomingAppointment[]>([]);
  past = signal<PastAppointment[]>([]);

  profileForm = this.formBuilder.group({
    displayName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.email]],
    phoneNumber: [''],
    age: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
    gender: [''],
    dateOfBirth: [''],
    address: ['', [Validators.required]]
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

    if (this.isDoctor()) {
      this.loadDoctorAccount();
      return;
    }

    this.patientService.getMyProfile().subscribe({
      next: (profile) => {
        this.loadProfileDetails(profile);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.loadProfileFromDetailsFallback();
          return;
        }

        this.loadAccountFallback();
      }
    });
  }

  private loadDoctorAccount(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.hasSavedPatientProfile.set(false);
        this.patientId.set(null);
        this.applyPatientData(user as PatientProfileResponse);
        this.loadDoctorAppointmentsForProfile();
      },
      error: () => {
        this.error.set('Failed to load doctor information');
        this.loading.set(false);
      }
    });
  }

  private loadDoctorAppointmentsForProfile(): void {
    this.clinicService.getMyClinics().pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (clinics) => {
        if (clinics.length === 0) {
          this.applyAppointments([]);
          return;
        }

        forkJoin(
          clinics.map((clinic) =>
            this.appointmentService.getClinicAppointmentsWithResolvedStatuses(clinic.id).pipe(
              catchError(() => of([]))
            )
          )
        ).subscribe({
          next: (groups) => {
            const appointments = groups.flat().map((appointment) => {
              const clinic = clinics.find((item) => item.id === Number(appointment.clinicId));

              return {
                ...appointment,
                clinicName: appointment.clinicName || clinic?.clinicName || `Clinic ${appointment.clinicId}`
              };
            });

            this.applyAppointments(appointments);
          },
          error: () => this.applyAppointments([])
        });
      },
      error: () => this.applyAppointments([])
    });
  }

  private loadProfileDetails(profile: PatientProfileResponse): void {
    this.hasSavedPatientProfile.set(true);

    this.patientService.getMyDetails().pipe(catchError(() => of(null))).subscribe({
      next: (details) => {
        this.applyPatientData(profile, details as PatientProfileResponse | null);
        this.loadPatientAppointmentsForProfile();
      },
      error: () => {
        this.applyPatientData(profile);
        this.loadPatientAppointmentsForProfile();
      }
    });
  }

  private loadProfileFromDetailsFallback(): void {
    this.patientService.getMyDetails().subscribe({
      next: (details) => {
        this.loadProfileDetails(details);
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

  private loadAccountAsNewPatient(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.hasSavedPatientProfile.set(false);
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
        this.loadPatientAppointmentsForProfile();
      },
      error: () => {
        this.error.set('Failed to load patient information');
        this.loading.set(false);
      }
    });
  }

  private loadPatientAppointmentsForProfile(): void {
    this.appointmentsLoaded = true;

    this.appointmentService
      .getPatientAppointments()
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (appointments) => {
          this.enrichPatientAppointments(appointments).subscribe({
            next: (enrichedAppointments) => {
              const { upcoming, past } = this.splitAppointments(enrichedAppointments);
              this.upcoming.set(upcoming);
              this.past.set(past);
              this.loading.set(false);
            },
            error: () => {
              const { upcoming, past } = this.splitAppointments(appointments);
              this.upcoming.set(upcoming);
              this.past.set(past);
              this.loading.set(false);
            }
          });
        },
        error: () => {
          this.upcoming.set([]);
          this.past.set([]);
          this.loading.set(false);
        }
      });
  }

  private enrichPatientAppointments(appointments: AppointmentResponse[]): Observable<AppointmentResponse[]> {
    const clinicIds = Array.from(
      new Set(
        appointments
          .map((appointment) => Number(appointment.clinicId))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );

    if (clinicIds.length === 0) {
      return of(appointments);
    }

    return forkJoin(
      clinicIds.map((id) =>
        this.clinicService.getClinicsById(id).pipe(catchError(() => of(null)))
      )
    ).pipe(
      catchError(() => of([])),
      map((clinics) => {
        const clinicMap = new Map(
          (clinics || [])
            .filter(Boolean)
            .map((clinic: any) => [Number(clinic.id), clinic])
        );

        return appointments.map((appointment): AppointmentResponse => {
          const clinic = clinicMap.get(Number(appointment.clinicId));
          return {
            ...appointment,
            clinicName: appointment.clinicName || clinic?.clinicName || `Clinic ${appointment.clinicId}`,
            doctorName: appointment.doctorName || clinic?.doctorName || 'Doctor'
          };
        });
      })
    );
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

    this.savingProfile.set(true);

    if (this.hasSavedPatientProfile()) {
      const payload = this.buildUpdatePayload();
      this.patientService
        .updatePatient(payload)
        .pipe(finalize(() => this.savingProfile.set(false)))
        .subscribe({
          next: () => {
            this.applyPatientData(this.currentPatient(), this.mapUpdateToProfile(payload));
            this.showNotice('Profile updated successfully.', 'success');
          },
          error: (error: HttpErrorResponse) => {
            this.showNotice(this.getSaveErrorMessage(error), 'error');
          }
        });
      return;
    }

    const createPayload = this.buildCreatePayload();
    if (!createPayload.userId) {
      this.savingProfile.set(false);
      this.showNotice('Session expired. Please log in again.', 'error');
      return;
    }

    this.patientService
      .createPatient(createPayload)
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: (response) => {
          this.applyPatientData(response);
          this.hasSavedPatientProfile.set(true);
          this.showNotice('Profile saved successfully.', 'success');
        },
        error: (error: HttpErrorResponse) => {
          this.showNotice(this.getSaveErrorMessage(error), 'error');
        }
      });
  }

  saveMedicalData(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.showNotice('Please complete the required profile fields before saving medical data.', 'error');
      return;
    }

    const allergies = this.deduplicateById(this.cleanMedicalRows<PatientAllergy>(this.allergies.getRawValue()));
    const medicalRecords = this.deduplicateById(this.cleanMedicalRows<PatientMedicalRecord>(this.medicalRecords.getRawValue()));

    this.setAllergyRows(allergies);
    this.setMedicalRecordRows(medicalRecords);

    const payload = this.buildMedicalDataPayload(allergies, medicalRecords);
    this.savingMedical.set(true);

    if (this.hasSavedPatientProfile()) {
      const deletedMedicalRecordIds = Array.from(this.deletedMedicalRecordIds);
      const deletedAllergyIds = Array.from(this.deletedAllergyIds);
      const deleteRequests = [
        ...deletedMedicalRecordIds.map((id) => this.patientService.deleteMedicalRecord(id)),
        ...deletedAllergyIds.map((id) => this.patientService.deleteAllergy(id))
      ];
      const deleteRecords$ = deleteRequests.length > 0 ? forkJoin(deleteRequests) : of([]);

      deleteRecords$
        .pipe(
          switchMap(() => this.patientService.saveMyMedicalData(payload)),
          finalize(() => this.savingMedical.set(false))
        )
        .subscribe({
          next: (profile) => {
            this.deletedMedicalRecordIds.clear();
            this.deletedAllergyIds.clear();
            this.applyPatientData(this.currentPatient(), profile, payload);
            this.showNotice('Medical data saved successfully.', 'success');
          },
          error: (error: HttpErrorResponse) => {
            this.showNotice(this.getSaveErrorMessage(error), 'error');
          }
        });
      return;
    }

    const createPayload = this.buildCreatePayload();
    if (!createPayload.userId) {
      this.savingMedical.set(false);
      this.showNotice('Session expired. Please log in again.', 'error');
      return;
    }

    this.patientService
      .createPatient(createPayload)
      .pipe(finalize(() => this.savingMedical.set(false)))
      .subscribe({
        next: (response) => {
          this.applyPatientData(response);
          this.hasSavedPatientProfile.set(true);
          this.showNotice('Profile and medical data saved successfully.', 'success');
        },
        error: (error: HttpErrorResponse) => {
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

    const identityUserId = this.readString(merged, ['identityUserId']);
    const recordId = this.readValue(merged, ['id', 'patientId']);
    const authUserId = this.authService.getCurrentUserId();
    const isPatientRecordId =
      recordId !== null &&
      recordId !== undefined &&
      recordId !== '' &&
      (!authUserId || String(recordId) !== authUserId) &&
      (!identityUserId || String(recordId) !== identityUserId);

    if (isPatientRecordId && (typeof recordId === 'string' || typeof recordId === 'number')) {
      this.patientId.set(recordId);
    } else {
      this.patientId.set(null);
    }

    const name = this.readString(merged, ['displayName', 'fullName', 'name']) || 'Unknown User';
    const email = this.readString(merged, ['email', 'userName']);
    const phone = this.readString(merged, ['phoneNumber', 'phone']);
    const rawAge = this.readNumber(merged, ['age']);
    const dateOfBirth = this.readString(merged, ['dateOfBirth']);
    const gender = this.formatGender(this.readValue(merged, ['gender']));
    const bloodType = this.readString(merged, ['bloodType']);
    const address = this.readString(merged, ['address']);

    const computedAge = this.computeAge(rawAge, dateOfBirth);

    this.patientName.set(name);
    this.patientInitials.set(this.getInitials(name));
    this.age.set(computedAge);
    this.userEmail.set(email);
    this.phoneNumber.set(phone);
    this.gender.set(gender);
    this.bloodType.set(bloodType);
    this.address.set(address);

    this.profileForm.patchValue({
      displayName: name === 'Unknown User' ? '' : name,
      email,
      phoneNumber: phone,
      age: computedAge,
      gender,
      dateOfBirth: this.formatDateInput(dateOfBirth),
      address
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

  private computeAge(rawAge: number | undefined, dateOfBirth: string | null): number | null {
    if (rawAge != null && Number.isFinite(rawAge) && rawAge > 0) {
      return rawAge;
    }

    if (!dateOfBirth) {
      return null;
    }

    const date = new Date(dateOfBirth);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const dayDiff = today.getDate() - date.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1;
    }

    return age >= 0 ? age : null;
  }

  removeAllergy(index: number): void {
    if (index < 0 || index >= this.allergies.length) {
      return;
    }

    const allergyId = Number(this.allergies.at(index).get('id')?.value);
    if (Number.isFinite(allergyId) && allergyId > 0 && this.hasSavedPatientProfile()) {
      this.savingMedical.set(true);
      this.patientService.deleteAllergy(allergyId).pipe(
        finalize(() => this.savingMedical.set(false))
      ).subscribe({
        next: () => {
          this.allergies.removeAt(index);
          if (this.allergies.length === 0) {
            this.allergies.push(this.createAllergyGroup());
          }
          this.showNotice('Allergy deleted successfully.', 'success');
        },
        error: () => {
          this.showNotice('Failed to delete the allergy. Please try again.', 'error');
        }
      });
      return;
    }

    if (this.allergies.length > 1) {
      this.allergies.removeAt(index);
    }
  }

  addMedicalRecord(): void {
    this.medicalRecords.push(this.createMedicalRecordGroup());
  }

  removeMedicalRecord(index: number): void {
    if (index < 0 || index >= this.medicalRecords.length) {
      return;
    }

    const recordId = Number(this.medicalRecords.at(index).get('id')?.value);
    if (Number.isFinite(recordId) && recordId > 0 && this.hasSavedPatientProfile()) {
      this.savingMedical.set(true);
      this.patientService.deleteMedicalRecord(recordId).pipe(
        finalize(() => this.savingMedical.set(false))
      ).subscribe({
        next: () => {
          this.medicalRecords.removeAt(index);
          if (this.medicalRecords.length === 0) {
            this.medicalRecords.push(this.createMedicalRecordGroup());
          }
          this.showNotice('Medical record deleted successfully.', 'success');
        },
        error: () => {
          this.showNotice('Failed to delete the medical record. Please try again.', 'error');
        }
      });
      return;
    }

    if (Number.isFinite(recordId) && recordId > 0) {
      this.deletedMedicalRecordIds.add(recordId);
    }

    this.medicalRecords.removeAt(index);

    if (this.medicalRecords.length === 0) {
      this.medicalRecords.push(this.createMedicalRecordGroup());
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
    const seen = new Map<string, T>();

    for (const item of items) {
      let key: string;

      if ('name' in item && 'description' in item) {
        const allergy = item as { name?: string; description?: string };
        key = `allergy:${allergy.name || ''}__${allergy.description || ''}`.toLowerCase().trim();
      }

      else if ('diagnosis' in item && 'notes' in item) {
        const record = item as { diagnosis?: string; notes?: string };
        key = `record:${record.diagnosis || ''}__${record.notes || ''}`.toLowerCase().trim();
      }

      else {
        key = item.id && item.id > 0 ? `id:${item.id}` : JSON.stringify(item);
      }

      if (!seen.has(key)) {
        seen.set(key, item);
      }
    }

    return Array.from(seen.values());
  }

  private buildUpdatePayload(): PatientUpdateRequest {
    const profile = this.profileForm.getRawValue();
    const allergies = this.deduplicateById(this.cleanMedicalRows<PatientAllergy>(this.allergies.getRawValue()));
    const medicalRecords = this.deduplicateById(
      this.cleanMedicalRows<PatientMedicalRecord>(this.medicalRecords.getRawValue())
    );

    return {
      fullName: String(profile.displayName || '').trim(),
      email: String(profile.email || '').trim(),
      phoneNumber: String(profile.phoneNumber || '').trim(),
      address: String(profile.address || '').trim(),
      allergies: allergies.map((allergy) => ({
        id: allergy.id ?? 0,
        name: allergy.name,
        description: allergy.description
      })),
      medicalRecords: medicalRecords.map((record) => ({
        id: record.id ?? 0,
        diagnosis: record.diagnosis,
        notes: record.notes
      }))
    };
  }

  private buildMedicalDataPayload(
    allergies: PatientAllergy[],
    medicalRecords: PatientMedicalRecord[]
  ): PatientMedicalData {
    return {
      allergies: allergies.map((allergy) => ({
        id: allergy.id && allergy.id > 0 ? allergy.id : undefined,
        name: allergy.name,
        description: allergy.description
      })),
      medicalRecords: medicalRecords.map((record) => ({
        id: record.id && record.id > 0 ? record.id : undefined,
        diagnosis: record.diagnosis,
        notes: record.notes
      }))
    };
  }

  private mapUpdateToProfile(payload: PatientUpdateRequest): PatientProfileResponse {
    const profile = this.profileForm.getRawValue();
    return {
      fullName: payload.fullName,
      displayName: payload.fullName,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      age: this.parseAge(profile.age),
      address: payload.address,
      allergies: payload.allergies,
      medicalRecords: payload.medicalRecords
    };
  }

  private parseAge(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    }
    return undefined;
  }

  private buildCreatePayload(): PatientCreateRequest {
    const profile = this.profileForm.getRawValue();
    const dateOfBirth = String(profile.dateOfBirth || '').trim();
    const allergies = this.deduplicateById(this.cleanMedicalRows<PatientAllergy>(this.allergies.getRawValue()));
    const medicalRecords = this.deduplicateById(
      this.cleanMedicalRows<PatientMedicalRecord>(this.medicalRecords.getRawValue())
    );

    return {
      dateOfBirth: dateOfBirth ? `${dateOfBirth}T00:00:00` : new Date().toISOString(),
      gender: this.toGenderValue(profile.gender),
      address: String(profile.address || '').trim(),
      userId: this.authService.getCurrentUserId(),
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
        id: this.readOptionalNumber(item, ['id', 'allergyId', 'patientAllergyId']),
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
        id: this.readOptionalNumber(item, [
          'id',
          'Id',
          'recordId',
          'RecordId',
          'medicalRecordId',
          'MedicalRecordId',
          'patientMedicalRecordId',
          'PatientMedicalRecordId'
        ]),
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

  private readOptionalNumber(source: unknown, keys: string | string[]): number {
    if (!source || typeof source !== 'object') {
      return 0;
    }

    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const value = (source as Record<string, unknown>)[key];

      if (typeof value === 'number') {
        return value;
      }

      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return 0;
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

  private toGenderValue(value: unknown): number {
    if (value === 1 || value === '1' || String(value).toLowerCase() === 'male') {
      return 1;
    }

    if (value === 2 || value === '2' || String(value).toLowerCase() === 'female') {
      return 2;
    }

    return 0;
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
    const today = this.startOfDay(new Date()).getTime();

    appointments.forEach(appt => {

      const date = this.getAppointmentDate(appt);
      const sortValue = date?.getTime() ?? 0;

      const dateLabel = date
        ? date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'N/A';

      const timeLabel = `${this.formatTime(appt.startTime)} - ${this.formatTime(appt.endTime)}`;

      const rawStatus = this.getStatusString(appt.status);
      const clinicName = appt.clinicName || `Clinic ${appt.clinicId}`;
      const doctorName = this.isDoctor()
        ? (appt.patientName || 'Patient')
        : (appt.doctorName || 'Doctor');
      const isFutureOrToday = sortValue >= today;
      const status = this.resolveProfileAppointmentStatus(rawStatus);
      const normalizedStatus = status.toLowerCase();
      const isClosedStatus = ['cancelled', 'rejected', 'completed', 'noshow'].includes(normalizedStatus);

      if (!isClosedStatus && isFutureOrToday) {

        upcoming.push({
          id: appt.id,
          clinicName,
          dateLabel,
          timeLabel,
          status,
          sortValue
        });
      }

      if (isClosedStatus || !isFutureOrToday) {

        past.push({
          id: appt.id,
          clinicName,
          dateLabel,
          doctorName,
          status,
          sortValue
        });
      }
    });

    return {
      upcoming: upcoming.sort((a, b) => a.sortValue - b.sortValue),
      past: past.sort((a, b) => b.sortValue - a.sortValue)
    };
  }

  private resolveProfileAppointmentStatus(status: string): string {
    return status;
  }

  displayProfileAppointmentStatus(status: string): string {
    return this.resolveProfileAppointmentStatus(this.getStatusString(status));
  }

  getProfileStatusClass(status: string): string {
    const normalizedStatus = this
      .resolveProfileAppointmentStatus(this.getStatusString(status))
      .toLowerCase();

    switch (normalizedStatus) {
      case 'pending':
        return 'profile-status--pending';
      case 'confirmed':
        return 'profile-status--confirmed';
      case 'completed':
        return 'profile-status--completed';
      case 'cancelled':
      case 'rejected':
      case 'noshow':
        return 'profile-status--cancelled';
      default:
        return 'profile-status--default';
    }
  }

  private getAppointmentDate(appointment: AppointmentResponse): Date | null {
    const value = appointment.date || appointment.appointmentDate || appointment.startTime;

    if (!value) {
      return null;
    }

    const raw = String(value);
    const date = raw.includes('T') ? new Date(raw) : new Date(`${raw}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private getStatusString(status: number | string): string {
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

  private formatTime(timeString: string): string {
    if (!timeString) {
      return 'N/A';
    }

    const parsedDate = new Date(timeString);
    if (!Number.isNaN(parsedDate.getTime()) && timeString.includes('T')) {
      return parsedDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    const parts = timeString.split(':');

    if (parts.length < 2) {
      return 'N/A';
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return 'N/A';
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
    this.loadAppointmentsIfNeeded();
  }

  private loadAppointmentsIfNeeded(): void {
    if (this.isDoctor() || this.appointmentsLoaded || this.loading()) {
      return;
    }

    this.appointmentsLoaded = true;
    this.loadPatientAppointmentsForProfile();
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
              status: 'Cancelled',
              sortValue: Date.now()
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
