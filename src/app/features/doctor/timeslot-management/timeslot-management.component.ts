import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { DoctorFooterComponent } from '../../../shared/components/doctor-footer/doctor-footer.component';
import { ClinicService } from '../../../core/services/clinic.service';
import { TimeSlot } from '../../../shared/models/timeslot.interface';
import { ClinicResponse } from '../../../shared/models/clinic-response.interface';

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
  });

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

    const payload = {
      clinicId: Number(formValue.clinicId),
      startTime: new Date(formValue.startTime).toISOString(),
      endTime: new Date(formValue.endTime).toISOString(),
      capacity: Number(formValue.capacity),
      price: Number(formValue.price)
    };

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
          this.error.set(err.error?.message || 'Failed to update time slot.');
          this.loading.set(false);
        }
      });
    } else {
      this.clinicService.createTimeSlot(payload).subscribe({
        next: () => {
          this.success.set('Time slot created successfully!');
          this.loadTimeslots(this.selectedClinicId()!);
          this.cancelEdit();
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to create time slot.');
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
