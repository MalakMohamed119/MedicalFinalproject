import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClinicService } from '../../../core/services/clinic.service';




@Component({
  selector: 'app-add-doctor',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './add-doctor.component.html',
  styleUrl: './add-doctor.component.scss'
})
export class AddDoctorComponent {
  private fb = inject(FormBuilder);
  private clinicService = inject(ClinicService);
  private router = inject(Router);


  showPassword = false;
  isLoading = signal(false);
  errorMessage = signal('');

  addDoctorForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    specialty: ['', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern(/01[0-9]{9}/)]]
  });

  get formControls() {
    return this.addDoctorForm.controls;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.addDoctorForm.invalid) {
      this.addDoctorForm.markAllAsTouched();
      return;
    }

    const doctorData = {
      displayName: this.addDoctorForm.value.fullName,
      email: this.addDoctorForm.value.email,
      password: this.addDoctorForm.value.password,
      phoneNumber: this.addDoctorForm.value.phoneNumber,
      specialty: this.addDoctorForm.value.specialty
    };

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.clinicService.createDoctor(doctorData).subscribe({

      next: (res: any) => {
        alert('Doctor added successfully!');
        this.router.navigate(['/admin-dashboard']);
      },
      error: (err: any) => {
        console.error(err);
        alert('Error adding doctor');
        this.isLoading.set(false);
      }
    });


  }

  dismissError() {
    this.errorMessage.set('');
  }
}

