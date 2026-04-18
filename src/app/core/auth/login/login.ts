import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
  errorMessage = signal('');

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;

    // NORMAL LOGIN
    this.isLoading.set(true);
    this.errorMessage.set('');

    const credentials = {
      Email: email,
      Password: password
    };

        this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log('Login successful', response);
        this.isLoading.set(false);
        this.authService.setToken(response.accessToken || response.token || '');
        localStorage.setItem('userEmail', email);
        const role = this.authService.getRole();
        console.log('User Role detected:', role);
        if (role === 'Admin' || role === 'ClinicAdmin') {
          this.router.navigate(['/admin-dashboard']);
        } else {
          this.router.navigate(['/home-for-patient']);
        }

      },
      error: (error) => {
        console.error('Login error', error);
        this.errorMessage.set('Invalid credentials');
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
}

