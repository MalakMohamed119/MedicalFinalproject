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
    this.clinicService.getMyClinics().subscribe({
      next: (data) => {
        this.clinics = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading clinics:', err);
        this.loading = false;
      }
    });
  }

  showAddClinicForm(): void {
    this.showAddForm = true;
    this.editingClinic = null;
    this.clinicForm.reset();
  }

  editClinic(clinic: ClinicResponse): void {
    this.showAddForm = true;
    this.editingClinic = clinic;
    this.clinicForm.patchValue({
      clinicName: clinic.clinicName,
      clinicAddress: clinic.clinicAddress,
      description: clinic.description
    });
  }

  cancelEdit(): void {
    this.showAddForm = false;
    this.editingClinic = null;
    this.clinicForm.reset();
  }

  saveClinic(): void {
    if (this.clinicForm.invalid) return;

    this.loading = true;
    const formData = this.clinicForm.value;

    if (this.editingClinic) {
      // Update existing clinic
      this.clinicService.updateClinic(this.editingClinic.id, formData).subscribe({
        next: () => {
          this.loadMyClinics();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error updating clinic:', err);
          this.loading = false;
        }
      });
    } else {
      // Create new clinic
      this.clinicService.createClinic(formData).subscribe({
        next: () => {
          this.loadMyClinics();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error creating clinic:', err);
          this.loading = false;
        }
      });
    }
  }

  deleteClinic(clinic: ClinicResponse): void {
    if (confirm(`Are you sure you want to delete "${clinic.clinicName}"?`)) {
      this.loading = true;
      this.clinicService.deleteClinic(clinic.id).subscribe({
        next: () => {
          this.loadMyClinics();
        },
        error: (err) => {
          console.error('Error deleting clinic:', err);
          this.loading = false;
        }
      });
    }
  }
}
