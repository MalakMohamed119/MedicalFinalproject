import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
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
export class MyClinics implements OnInit, OnDestroy {
  private clinicService = inject(ClinicService);
  private fb = inject(FormBuilder);
  private document = inject(DOCUMENT);

  readonly clinics = signal<ClinicResponse[]>([]);
  readonly loading = signal(false);
  readonly showAddForm = signal(false);
  readonly editingClinic = signal<ClinicResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  /** Clinic shown in the view-details popup (replaces `alert`) */
  readonly viewingClinic = signal<ClinicResponse | null>(null);

  clinicForm: FormGroup = this.fb.group({
    clinicName: ['', [Validators.required]],
    clinicAddress: ['', [Validators.required]],
    description: ['']
  });

  ngOnInit(): void {
    this.loadMyClinics();
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('clinic-modal-open');
  }

  loadMyClinics(): void {
    this.loading.set(true);
    this.error.set(null);
    this.clinicService.getMyClinics().subscribe({
      next: (data) => {
        this.clinics.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading clinics:', err);
        this.error.set('Failed to load clinics. Please try again.');
        this.loading.set(false);
      }
    });
  }

  showAddClinicForm(): void {
    this.showAddForm.set(true);
    this.editingClinic.set(null);
    this.clinicForm.reset();
    this.error.set(null);
    this.success.set(null);
  }

  editClinic(clinic: ClinicResponse): void {
    this.showAddForm.set(true);
    this.editingClinic.set(clinic);
    this.clinicForm.patchValue({
      clinicName: clinic.clinicName,
      clinicAddress: clinic.clinicAddress,
      description: clinic.description
    });
    this.error.set(null);
    this.success.set(null);
  }

  viewClinic(clinic: ClinicResponse): void {
    this.viewingClinic.set(clinic);
    this.document.body.classList.add('clinic-modal-open');
  }

  closeViewClinic(): void {
    this.viewingClinic.set(null);
    this.document.body.classList.remove('clinic-modal-open');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.viewingClinic()) {
      this.closeViewClinic();
    }
  }

  cancelEdit(): void {
    this.showAddForm.set(false);
    this.editingClinic.set(null);
    this.clinicForm.reset();
    this.error.set(null);
    this.success.set(null);
  }

  saveClinic(): void {
    if (this.clinicForm.invalid) {
      this.error.set('Please fill in all required fields');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    const formData = this.clinicForm.value;
    const editing = this.editingClinic();

    if (editing) {
      this.clinicService.updateClinic(editing.id, formData).subscribe({
        next: () => {
          this.success.set('Clinic updated successfully!');
          this.loadMyClinics();
          this.cancelEdit();
        },
        error: (err) => {
          this.error.set('Failed to update clinic. Please try again.');
          this.loading.set(false);
        }
      });
    } else {
      this.clinicService.createClinic(formData).subscribe({
        next: () => {
          this.success.set('Clinic created successfully!');
          this.loadMyClinics();
          this.cancelEdit();
        },
        error: (err) => {
          this.error.set('Failed to create clinic. Please try again.');
          this.loading.set(false);
        }
      });
    }
  }

  deleteClinic(clinic: ClinicResponse): void {
    if (confirm(`Are you sure you want to delete "${clinic.clinicName}"?`)) {
      this.loading.set(true);
      this.clinicService.deleteClinic(clinic.id).subscribe({
        next: () => {
          this.success.set('Clinic deleted successfully!');
          this.loadMyClinics();
        },
        error: (err) => {
          this.error.set('Failed to delete clinic. Please try again.');
          this.loading.set(false);
        }
      });
    }
  }

  clearMessages(): void {
    this.error.set(null);
    this.success.set(null);
  }
}
