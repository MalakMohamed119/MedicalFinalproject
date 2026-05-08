import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { DoctorFooterComponent } from '../../../shared/components/doctor-footer/doctor-footer.component';
import { ClinicResponse } from '../../../shared/models/clinic-response.interface';
import { AppointmentResponse } from '../../../shared/models/appointment-response.interface';
import { ClinicService } from '../../../core/services/clinic.service';
import { AppointmentService } from '../../../core/services/appointment.service';

@Component({
  selector: 'app-my-clinics',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Navbar, DoctorFooterComponent],
  templateUrl: './my-clinics.component.html',
  styleUrls: ['./my-clinics.component.scss']
})
export class MyClinics implements OnInit, OnDestroy {
  private clinicService = inject(ClinicService);
  private appointmentService = inject(AppointmentService);
  private fb = inject(FormBuilder);
  private document = inject(DOCUMENT);

  readonly clinics = signal<ClinicResponse[]>([]);
  readonly loading = signal(false);
  readonly showAddForm = signal(false);
  readonly editingClinic = signal<ClinicResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly viewingClinic = signal<ClinicResponse | null>(null);
  
  // Appointments related signals
  readonly showingAppointments = signal<ClinicResponse | null>(null);
  readonly clinicAppointments = signal<AppointmentResponse[]>([]);
  readonly appointmentsLoading = signal(false);
  readonly appointmentsError = signal<string | null>(null);

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

  // Appointments methods
  viewClinicAppointments(clinic: ClinicResponse): void {
    this.showingAppointments.set(clinic);
    this.loadClinicAppointments(clinic.id);
  }

  loadClinicAppointments(clinicId: number): void {
    this.appointmentsLoading.set(true);
    this.appointmentsError.set(null);

    this.appointmentService.getClinicAppointments(clinicId).subscribe({
      next: (appointments: AppointmentResponse[]) => {
        this.clinicAppointments.set(appointments);
        this.appointmentsLoading.set(false);
        console.log('Clinic appointments loaded:', appointments);
      },
      error: (err: any) => {
        console.error('Error loading clinic appointments:', err);
        this.appointmentsError.set('Failed to load appointments. Please try again.');
        this.appointmentsLoading.set(false);
      }
    });
  }

  closeAppointmentsView(): void {
    this.showingAppointments.set(null);
    this.clinicAppointments.set([]);
    this.appointmentsError.set(null);
  }

  updateAppointmentStatus(appointmentId: number, status: string): void {
    this.appointmentService.updateAppointmentStatus(appointmentId, status).subscribe({
      next: () => {
        console.log('Appointment status updated successfully');
        const currentClinic = this.showingAppointments();
        if (currentClinic) {
          this.loadClinicAppointments(currentClinic.id);
        }
      },
      error: (err: any) => {
        console.error('Error updating appointment status:', err);
        this.error.set('Failed to update appointment status.');
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(timeString: string): string {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusString(status: number | string): string {
    // Convert status number to string
    if (typeof status === 'number') {
      switch (status) {
        case 0: return 'Pending';
        case 1: return 'Confirmed';
        case 2: return 'Completed';
        case 3: return 'Cancelled';
        default: return 'Unknown';
      }
    }
    // If it's already a string, return as is
    return status;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'status-confirmed';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-default';
    }
  }
}
