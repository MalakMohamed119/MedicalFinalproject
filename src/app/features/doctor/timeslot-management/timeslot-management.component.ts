import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { DoctorFooterComponent } from '../../../shared/components/doctor-footer/doctor-footer.component';
import { ClinicService } from '../../../core/services/clinic.service';
import { TimeSlot } from '../../../shared/models/timeslot.interface';
import { ClinicResponse } from '../../../shared/models/clinic-response.interface';

function timeRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startTime')?.value;
  const end = group.get('endTime')?.value;

  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate.getTime() <= startDate.getTime()) {
      return { timeRange: true };
    }
  }
  return null;
}

@Component({
  selector: 'app-timeslot-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Navbar, DoctorFooterComponent],
  templateUrl: './timeslot-management.component.html',
  styleUrls: ['./timeslot-management.component.scss']
})
export class TimeslotManagement implements OnInit {
  private clinicService = inject(ClinicService);
  private fb = inject(FormBuilder);

  readonly timeslots = signal<TimeSlot[]>([]);
  readonly clinics = signal<ClinicResponse[]>([]);
  readonly loading = signal(false);
  readonly showAddForm = signal(false);
  readonly editingSlot = signal<TimeSlot | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly selectedClinicId = signal<number | null>(null);

  slotForm: FormGroup = this.fb.group({
    clinicId: ['', Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    capacity: ['', [Validators.required, Validators.min(1)]],
    price: ['', [Validators.required, Validators.min(0)]]
  }, { validators: timeRangeValidator });

  ngOnInit(): void {
    this.loadMyClinics();
  }

  loadMyClinics(): void {
    this.clinicService.getMyClinics().subscribe({
      next: (data) => {
        this.clinics.set(data);
        if (data.length > 0) {
          this.selectedClinicId.set(data[0].id);
          this.loadTimeslots(data[0].id);
        }
      },
      error: () => this.error.set('Failed to load clinics.')
    });
  }

  onClinicChange(event: Event): void {
    const clinicId = Number((event.target as HTMLSelectElement).value);
    this.selectedClinicId.set(clinicId);
    this.loadTimeslots(clinicId);
  }

  loadTimeslots(clinicId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.clinicService.getTimeSlotsByClinic(clinicId).subscribe({
      next: (data) => {
        this.timeslots.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load time slots.');
        this.loading.set(false);
      }
    });
  }

  showAddSlotForm(): void {
    this.showAddForm.set(true);
    this.editingSlot.set(null);
    this.slotForm.reset();
    if (this.selectedClinicId()) {
      this.slotForm.patchValue({ clinicId: this.selectedClinicId() });
    }
    this.error.set(null);
    this.success.set(null);
  }

  editSlot(slot: TimeSlot): void {
    this.showAddForm.set(true);
    this.editingSlot.set(slot);
    this.slotForm.patchValue({
      clinicId: slot.clinicId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      price: slot.price
    });
    this.error.set(null);
    this.success.set(null);
  }

  cancelEdit(): void {
    this.showAddForm.set(false);
    this.editingSlot.set(null);
    this.slotForm.reset();
    this.error.set(null);
    this.success.set(null);
  }

  saveSlot(): void {
    if (this.slotForm.invalid) {
      this.slotForm.markAllAsTouched();
      this.error.set('Please fill in all required fields correctly.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const formValue = this.slotForm.value;
    const editing = this.editingSlot();

    // Try different payload formats that backend might expect
    const startDate = new Date(formValue.startTime);
    const endDate = new Date(formValue.endTime);
    
    // Extract date part (YYYY-MM-DD format)
    const date = startDate.toISOString().split('T')[0];
    
    // Extract time parts (HH:mm format)
    const startTime = startDate.toTimeString().slice(0, 5);
    const endTime = endDate.toTimeString().slice(0, 5);
    
    // Use format that backend expects - wrap in 'request' object
    const payload = {
      request: {
        clinicId: Number(formValue.clinicId),
        date: date,
        startTime: startTime,
        endTime: endTime,
        capacity: Number(formValue.capacity),
        price: Number(formValue.price)
      }
    };
    
    console.log('Creating time slot with payload:', payload);

    if (editing) {
      const updatePayload = {
        request: {
          date: payload.request.date,
          startTime: payload.request.startTime,
          endTime: payload.request.endTime,
          capacity: payload.request.capacity,
          price: payload.request.price
        }
      };
      this.clinicService.updateTimeSlot(editing.id, updatePayload).subscribe({
        next: () => {
          this.success.set('Time slot updated successfully!');
          this.loadTimeslots(this.selectedClinicId()!);
          this.cancelEdit();
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to update time slot.');
          this.loading.set(false);
        }
      });
    } else {
      console.log('Creating time slot with payload:', JSON.stringify(payload, null, 2));
      
      this.clinicService.createTimeSlot(payload).subscribe({
        next: (response) => {
          console.log('Time slot creation successful:', response);
          this.success.set('Time slot created successfully!');
          this.loadTimeslots(this.selectedClinicId()!);
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Time slot creation error:', err);
          console.error('Error status:', err.status);
          console.error('Error response body:', JSON.stringify(err.error, null, 2));
          
          // Extract the actual error message
          let errorMessage = 'Failed to create time slot.';
          if (err.error?.errors?.TimeSlot && Array.isArray(err.error.errors.TimeSlot)) {
            errorMessage = err.error.errors.TimeSlot.join(', ');
          } else if (err.error?.message) {
            errorMessage = err.error.message;
          } else if (err.error?.error) {
            errorMessage = err.error.error;
          } else if (err.error?.title) {
            errorMessage = err.error.title;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          console.log('Error message to display:', errorMessage);
          this.error.set(errorMessage);
          this.loading.set(false);
        }
      });
    }
  }

  deleteSlot(slot: TimeSlot): void {
    if (confirm(`Delete time slot from ${this.formatTime(slot.startTime)} to ${this.formatTime(slot.endTime)}?`)) {
      this.loading.set(true);
      this.clinicService.deleteTimeSlot(slot.id).subscribe({
        next: () => {
          this.success.set('Time slot deleted successfully!');
          this.loadTimeslots(this.selectedClinicId()!);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Cannot delete slot with active bookings.');
          this.loading.set(false);
        }
      });
    }
  }

  clearMessages(): void {
    this.error.set(null);
    this.success.set(null);
  }

  formatTime(time: string): string {
    if (!time) return '';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  formatDate(time: string): string {
    if (!time) return '';
    return new Date(time).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  }
}
