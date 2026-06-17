import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { ClinicService } from '../../../core/services/clinic.service';
import { formatAppError } from '../../../shared/utils/error-message.util';

@Component({
  selector: 'app-add-doctor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminSidebarComponent],
  templateUrl: './add-doctor.component.html',
  styleUrl: './add-doctor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddDoctorComponent {
  private fb = inject(FormBuilder);
  private clinicService = inject(ClinicService);
  private router = inject(Router);

  readonly specialties = [
    'Dermatology',
    'Dentistry',
    'Psychiatry',
    'Pediatrics and Neonatology',
    'Neurology',
    'Orthopedics',
    'Obstetrics and Gynecology',
    'ENT',
    'Cardiology and Vascular Diseases',
    'Interventional Radiology',
    'Hematology',
    'Oncology',
    'Internal Medicine',
    'Nutrition and Weight Loss',
    'Pediatric Surgery',
    'Surgical Oncology',
    'Vascular Surgery',
    'Plastic Surgery',
    'Bariatric and Laparoscopic Surgery',
    'General Surgery',
    'Spine Surgery',
    'Cardiothoracic Surgery',
    'Neurosurgery',
    'Gastroenterology and Endoscopy',
    'Allergy and Immunology',
    'IVF and Infertility',
    'Andrology and Infertility',
    'Rheumatology',
    'Endocrinology and Diabetes',
    'Audiology',
    'Chest and Respiratory Medicine',
    'Family Medicine',
    'Geriatrics',
    'Veterinary Medicine',
    'Chiropractic',
    'Pain Management',
    'Physical Therapy and Sports Injuries',
    'Ophthalmology',
    'Hepatology',
    'Nephrology',
    'Urology',
    'General Practice',
    'Speech Therapy'
  ];

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
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
    ]],
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
      displayName: String(formValue.displayName).trim(),
      email: String(formValue.email).trim().toLowerCase(),
      phoneNumber: String(formValue.phoneNumber).trim(),
      specialty: String(formValue.specialty).trim(),
      password: formValue.password
    }).subscribe({
      next: (response) => {
        console.log('Create doctor success:', response);
        this.isLoading.set(false);
        this.router.navigate(['/admin/manage-doctors']);
      },
      error: (err: any) => {
        console.log('Create doctor error:', err);
        this.errorMessage.set(formatAppError(err, 'Failed to create doctor. Please try again.'));
        this.isLoading.set(false);
        console.error(err);
      }
    });
  }
}
