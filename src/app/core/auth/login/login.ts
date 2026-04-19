import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
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

    this.isLoading.set(true);
    this.errorMessage.set('');

    const credentials = {
      Email: email,
      Password: password
    };

    this.authService.login(credentials).subscribe({
      next: (res: any) => {
        console.log('Full API Response:', res);
        console.log('Login successful', res);
        this.isLoading.set(false);
        localStorage.setItem('token', res.accessToken);
        localStorage.setItem('email', res.email || email);
        
        // Decode JWT for role with MS Claim
        const decodedToken: any = jwtDecode(res.accessToken);
        console.log('Decoded JWT:', decodedToken);
        const role = decodedToken.role || 
                     decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
                     decodedToken['role'] || 'Patient';
        console.log('Extracted Role:', role);
        localStorage.setItem('role', role);
        
        if (role === 'Admin') {
          this.router.navigate(['/admin-dashboard']);
        } else if (role === 'Doctor') {
          this.router.navigate(['/doctor-dashboard']);
        } else {
          this.router.navigate(['/home-for-patient']);
        }
      },
      error: (error: any) => {
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

