import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { ClinicResponse } from '../../../shared/models/clinic-response.interface';
import { ClinicService } from '../../../core/services/clinic.service';

@Component({
  selector: 'app-my-clinics',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Navbar, Footer],
  templateUrl: './my-clinics.component.html',
  styleUrls: ['./my-clinics.component.scss']
})
export class MyClinics implements OnInit {
  private clinicService = inject(ClinicService);
  private fb = inject(FormBuilder);

  clinics: ClinicResponse[] = [];
  loading = false;
  showAddForm = false;
  editingClinic: ClinicResponse | null = null;
  error: string | null = null;
  success: string | null = null;

  clinicForm: FormGroup = this.fb.group({
    clinicName: ['', [Validators.required]],
    clinicAddress: ['', [Validators.required]],
    description: ['']
  });

  ngOnInit(): void {
    this.loadMyClinics();
  }

  loadMyClinics(): void {
    this.loading = true;
    this.error = null;
    console.log('Loading my clinics...');
    
    this.clinicService.getMyClinics().subscribe({
      next: (data) => {
        console.log('Clinics loaded:', data);
        this.clinics = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading clinics:', err);
        this.error = 'Failed to load clinics. Please try again.';
        this.loading = false;
      }
    });
  }

  showAddClinicForm(): void {
    this.showAddForm = true;
    this.editingClinic = null;
    this.clinicForm.reset();
    this.error = null;
    this.success = null;
  }

  editClinic(clinic: ClinicResponse): void {
    this.showAddForm = true;
    this.editingClinic = clinic;
    this.clinicForm.patchValue({
      clinicName: clinic.clinicName,
      clinicAddress: clinic.clinicAddress,
      description: clinic.description
    });
    this.error = null;
    this.success = null;
  }

  viewClinic(clinic: ClinicResponse): void {
    alert(`
Clinic Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${clinic.clinicName}
Address: ${clinic.clinicAddress}
Description: ${clinic.description || 'N/A'}
Doctor: ${clinic.doctorName}
ID: ${clinic.id}
    `);
  }

  cancelEdit(): void {
    this.showAddForm = false;
    this.editingClinic = null;
    this.clinicForm.reset();
    this.error = null;
    this.success = null;
  }

  saveClinic(): void {
    if (this.clinicForm.invalid) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;
    const formData = this.clinicForm.value;

    if (this.editingClinic) {
      // Update existing clinic
      console.log('Updating clinic:', this.editingClinic.id, formData);
      this.clinicService.updateClinic(this.editingClinic.id, formData).subscribe({
        next: () => {
          this.success = 'Clinic updated successfully!';
          console.log('Clinic updated');
          this.loadMyClinics();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error updating clinic:', err);
          this.error = 'Failed to update clinic. Please try again.';
          this.loading = false;
        }
      });
    } else {
      // Create new clinic
      console.log('Creating new clinic:', formData);
      this.clinicService.createClinic(formData).subscribe({
        next: () => {
          this.success = 'Clinic created successfully!';
          console.log('Clinic created');
          this.loadMyClinics();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error creating clinic:', err);
          this.error = 'Failed to create clinic. Please try again.';
          this.loading = false;
        }
      });
    }
  }

  deleteClinic(clinic: ClinicResponse): void {
    if (confirm(`Are you sure you want to delete "${clinic.clinicName}"?`)) {
      this.loading = true;
      console.log('Deleting clinic:', clinic.id);
      this.clinicService.deleteClinic(clinic.id).subscribe({
        next: () => {
          this.success = 'Clinic deleted successfully!';
          console.log('Clinic deleted');
          this.loadMyClinics();
        },
        error: (err) => {
          console.error('Error deleting clinic:', err);
          this.error = 'Failed to delete clinic. Please try again.';
          this.loading = false;
        }
      });
    }
  }

  clearMessages(): void {
    this.error = null;
    this.success = null;
  }
}
