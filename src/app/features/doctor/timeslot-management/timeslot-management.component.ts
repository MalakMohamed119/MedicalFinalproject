import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { catchError, map, of } from 'rxjs';
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
    this.clinicService.getMyClinics().pipe(
      map((clinics) => this.dedupeClinics(clinics)),
      catchError(() => of([]))
    ).subscribe({
      next: (clinics) => {
        this.clinics.set(clinics);
        if (clinics.length > 0) {
          this.selectedClinicId.set(clinics[0].id);
          this.loadTimeslots(clinics[0].id);
        } else {
          this.timeslots.set([]);
          this.error.set('No clinics assigned to your doctor account.');
        }
      },
      error: () => this.error.set('Failed to load clinics.')
    });
  }

  private dedupeClinics(clinics: ClinicResponse[]): ClinicResponse[] {
    const byId = new Map<number, ClinicResponse>();

    for (const clinic of clinics) {
      if (clinic.id > 0 && !byId.has(clinic.id)) {
        byId.set(clinic.id, clinic);
      }
    }

    return Array.from(byId.values());
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
    const clinicId = Number(formValue.clinicId);

    if (!this.clinics().some((clinic) => clinic.id === clinicId)) {
      this.loading.set(false);
      this.error.set('Please select one of your clinics before saving.');
      return;
    }

    const startDate = new Date(formValue.startTime);
    const endDate = new Date(formValue.endTime);

    const payload = {
      clinicId,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      capacity: Number(formValue.capacity),
      price: Number(formValue.price)
    };

    console.log('Creating time slot with payload:', payload);

    if (editing) {
      const updatePayload = {
        startTime: payload.startTime,
        endTime: payload.endTime,
        capacity: payload.capacity,
        price: payload.price
      };
      this.clinicService.updateTimeSlot(editing.id, updatePayload).subscribe({
        next: () => {
          this.success.set('Time slot updated successfully!');
          this.loadTimeslots(this.selectedClinicId()!);
          this.cancelEdit();
        },
        error: (err) => {
          this.error.set(this.getTimeSlotErrorMessage(err, 'Failed to update time slot.'));
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
          
          const errorMessage = this.getTimeSlotErrorMessage(err, 'Failed to create time slot.');
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

  private getTimeSlotErrorMessage(err: any, fallback: string): string {
    if (err.error?.detail) {
      return err.error.detail;
    }

    if (err.error?.errors?.TimeSlot && Array.isArray(err.error.errors.TimeSlot)) {
      return err.error.errors.TimeSlot.join(', ');
    }

    if (Array.isArray(err.error?.errors)) {
      return err.error.errors
        .map((error: { description?: string; code?: string }) => error.description || error.code)
        .filter(Boolean)
        .join(', ') || fallback;
    }

    return err.error?.message ||
      err.error?.error ||
      (typeof err.error === 'string' ? err.error : '') ||
      err.message ||
      fallback;
  }

  formatTime(time: string): string {
    if (!time) return '';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  formatDate(time: string): string {
    if (!time) return '';
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return 'Invalid date';

    return date.toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  formatDateDay(time: string): string {
    if (!time) return '';
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return '--';

    return date.toLocaleDateString('en-US', { day: '2-digit' });
  }

  formatDateMonth(time: string): string {
    if (!time) return '';
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return 'Date';

    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}
