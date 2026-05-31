import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService } from '../../../core/services/patient.service';
import {
  PatientAllergy,
  PatientCreateRequest,
  PatientMedicalRecord
} from '../../../shared/models/patient.interface';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './complete-profile.component.html',
  styleUrl: './complete-profile.component.scss'
})
export class CompleteProfileComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private patientService = inject(PatientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly profileForm = this.formBuilder.group({
    dateOfBirth: ['', Validators.required],
    gender: [1, Validators.required],
    address: ['', [Validators.required, Validators.minLength(2)]],
    allergies: this.formBuilder.array([this.createAllergyGroup()]),
    medicalRecords: this.formBuilder.array([this.createMedicalRecordGroup()])
  });

  ngOnInit(): void {
    this.patientService.getMyProfile().subscribe({
      next: () => this.router.navigate(['/home-for-patient']),
      error: (error) => {
        if (error.status === 404) {
          this.loading.set(false);
          return;
        }

        this.loading.set(false);
        this.error.set('Could not check your patient profile. Please try again.');
      }
    });
  }

  get allergies(): FormArray {
    return this.profileForm.get('allergies') as FormArray;
  }

  get medicalRecords(): FormArray {
    return this.profileForm.get('medicalRecords') as FormArray;
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

  submit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.error.set('Please complete the required fields.');
      return;
    }

    const payload = this.buildPayload();

    this.saving.set(true);
    this.error.set(null);

    this.patientService.createPatient(payload).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || '/home-for-patient');
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(
          error.error?.message ||
            error.error?.detail ||
            error.error?.title ||
            'Could not save your patient profile. Please try again.'
        );
      }
    });
  }

  private createAllergyGroup() {
    return this.formBuilder.group({
      name: [''],
      description: ['']
    });
  }

  private createMedicalRecordGroup() {
    return this.formBuilder.group({
      diagnosis: [''],
      notes: ['']
    });
  }

  private buildPayload(): PatientCreateRequest {
    const value = this.profileForm.getRawValue();

    return {
      dateOfBirth: `${value.dateOfBirth}T00:00:00`,
      gender: Number(value.gender),
      address: String(value.address).trim(),
      allergies: this.cleanRows<PatientAllergy>(value.allergies),
      medicalRecords: this.cleanRows<PatientMedicalRecord>(value.medicalRecords)
    };
  }

  private cleanRows<T extends object>(rows: unknown): T[] {
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row) => {
        const cleaned = Object.entries(row as Record<string, unknown>).reduce<Record<string, string>>(
          (result, [key, value]) => {
            result[key] = typeof value === 'string' ? value.trim() : '';
            return result;
          },
          {}
        );

        return cleaned as T;
      })
      .filter((row) => Object.values(row).some(Boolean));
  }
}
