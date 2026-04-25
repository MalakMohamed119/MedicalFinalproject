import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  registerForm: FormGroup;
  isLoading: boolean = false;
  passwordMismatch: boolean = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private _formBuilder: FormBuilder,
    private _authService: AuthService,
    private _router: Router,
    private _toastService: ToastService
  ) {
    this.registerForm = this._formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]],
      rePassword: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]]
    });
  }

  checkPasswordMatch() {
    const password = this.registerForm.get('password')?.value;
    const rePassword = this.registerForm.get('rePassword')?.value;
    this.passwordMismatch = password !== rePassword;
    if (this.passwordMismatch) {
      this.registerForm.get('rePassword')?.setErrors({ 'mismatch': true });
    } else {
      this.registerForm.get('rePassword')?.setErrors(null);
    }
  }

  handleRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    if (this.registerForm.get('password')?.value !== this.registerForm.get('rePassword')?.value) {
      this.passwordMismatch = true;
      return;
    }

    this.isLoading = true;

    const userData = {
      displayName: this.registerForm.get('name')?.value,
      email: this.registerForm.get('email')?.value.toLowerCase(),
      password: this.registerForm.get('password')?.value,
      phoneNumber: this.registerForm.get('phone')?.value,
      role: 'Patient'
    };

    this._authService.register(userData).subscribe({
      next: (response: any) => {
        console.log('Registration successful', response);
        this._toastService.success('Registration successful!');
        this.registerForm.reset();
        this._router.navigate(['/login']);
      },
      error: (error: any) => {
        if (error.status === 500) {
          this._toastService.success('Registration successful!');
          this.registerForm.reset();
          this._router.navigate(['/login']);
          return;
        }
        const errors = error.error?.errors;
        let msg: string;
        if (errors) {
          msg = Object.values(errors).flat().join(' ');
        } else {
          msg = error.error?.detail || 
                error.error?.title || 
                'Registration failed. Please try again.';
        }
        this._toastService.error(msg);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  // Helper method to access form controls for validation messages
  get formControls() {
    return this.registerForm.controls;
  }

  togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }
}

