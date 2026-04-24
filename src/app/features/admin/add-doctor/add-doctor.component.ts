import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClinicService } from '../../../core/services/clinic.service';

@Component({
  selector: 'app-add-doctor',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './add-doctor.component.html',
  styleUrl: './add-doctor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddDoctorComponent {
  private fb = inject(FormBuilder);
  private clinicService = inject(ClinicService);
  private router = inject(Router);

  showPassword = false;
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  passwordMatchValidator = (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  };

  get f() {
    return this.addDoctorForm.controls;
  }

  readonly addDoctorForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^01[0-9]{9}$/)]],
    specialty: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  dismissError(): void {
    this.errorMessage.set('');
  }

  onSubmit(): void {
    console.log('Form submitted');
    console.log('Form valid:', this.addDoctorForm.valid);
    console.log('Form value:', this.addDoctorForm.value);
    if (this.addDoctorForm.invalid) {
      console.log('Form errors:', this.addDoctorForm.errors);
      this.addDoctorForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formValue = this.addDoctorForm.value as any;

    this.clinicService.createDoctor({
      displayName: formValue.displayName,
      email: formValue.email,
      phoneNumber: formValue.phoneNumber,
      specialty: formValue.specialty,
      password: formValue.password
    }).subscribe({
      next: (response) => {
        console.log('Create doctor success:', response);
        this.isLoading.set(false);
        this.router.navigate(['/admin/manage-doctors']);
      },
      error: (err: any) => {
        console.log('Create doctor error:', err);
        this.errorMessage.set(err.error?.message || err.message || 'Failed to create doctor');
        this.isLoading.set(false);
        console.error(err);
      }
    });
  }
}
