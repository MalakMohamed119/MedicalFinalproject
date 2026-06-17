import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PatientService } from '../../services/patient.service';
import { ToastService } from '../../services/toast.service';
import { formatAppError } from '../../../shared/utils/error-message.util';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  showPassword = false;
  loginForm: FormGroup;
  isLoading = signal(false);

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private patientService: PatientService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    if (typeof window !== 'undefined') {
      localStorage.clear();
    }

    const { email, password } = this.loginForm.value;
    const credentials = { 
      email: String(email).trim().toLowerCase(),
      password: password 
    };

    this.authService.login(credentials).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.accessToken);
        if (res.refreshToken) {
          localStorage.setItem('refreshToken', res.refreshToken);
        }
        localStorage.setItem('email', res.email || credentials.email);
        
        const decodedToken: any = jwtDecode(res.accessToken);
        const role = decodedToken.role || 
                     decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
                     decodedToken['role'] || 'Patient';
        localStorage.setItem('role', role);
        
        this.toastService.success('Login successful!');

        if (role === 'Admin') {
          this.router.navigate(['/admin-dashboard']);
        } else if (role === 'Doctor') {
          this.router.navigate(['/doctor/dashboard']);
        } else {
          this.routePatientAfterLogin();
          return;
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        const errorMessage =
          err.status === 401
            ? 'Invalid email or password. Please check your credentials and try again.'
            : err.status === 502
              ? 'Auth service is unavailable. Please try again later.'
              : formatAppError(err, 'Login failed. Please try again.');
        this.toastService.error(errorMessage);
        this.isLoading.set(false);
      }
    });
  }

  get formControls() {
    return this.loginForm.controls;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private routePatientAfterLogin(): void {
    this.patientService.hasPatientProfile().subscribe({
      next: (hasProfile) => {
        this.router.navigate([hasProfile ? '/home-for-patient' : '/complete-profile']);
        this.isLoading.set(false);
      },
      error: () => {
        this.router.navigate(['/home-for-patient']);
        this.isLoading.set(false);
      }
    });
  }
}

