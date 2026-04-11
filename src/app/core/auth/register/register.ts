import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
    private _router: Router
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
      name: this.registerForm.get('name')?.value,
      email: this.registerForm.get('email')?.value.toLowerCase(), // Convert email to lowercase
      password: this.registerForm.get('password')?.value,
      rePassword: this.registerForm.get('rePassword')?.value,
      phone: this.registerForm.get('phone')?.value
    };

    this._authService.signup(userData).subscribe({
      next: (response: any) => {
        console.log('Registration successful', response);
        // Show success message in the card
        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success mt-3';
        successMessage.textContent = 'Registration successful! You can now login.';
        
        const form = document.querySelector('form');
        if (form) {
          form.insertAdjacentElement('afterend', successMessage);
        }
        
        // Clear the form
        this.registerForm.reset();
        
        // Navigate to login after 2 seconds
        setTimeout(() => {
          this._router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        console.error('Registration error', error);
        
        // Show error message in the card
        const errorElement = document.createElement('div');
        errorElement.className = 'alert alert-danger mt-3';
        
        // Check for specific error messages
        if (error.error?.message?.includes('already in use')) {
          errorElement.textContent = 'This email is already registered. Please use a different email or try to login.';
        } else {
          errorElement.textContent = error.error?.message || 'Registration failed. Please check your information and try again.';
        }
        
        // Remove any existing error messages
        const existingError = document.querySelector('.alert-danger');
        if (existingError) {
          existingError.remove();
        }
        
        const form = document.querySelector('form');
        if (form) {
          form.insertAdjacentElement('afterend', errorElement);
        }
        
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
