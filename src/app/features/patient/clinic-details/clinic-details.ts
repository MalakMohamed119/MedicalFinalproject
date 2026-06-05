import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { PatientFooterComponent } from '../../../shared/components/patient-footer/patient-footer.component';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { ToastComponent } from '../../../shared/components/toast/toast.component';

import { ClinicService } from '../../../core/services/clinic.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ToastService } from '../../../core/services/toast.service';

import { ClinicResponse } from '../../../shared/models/clinic-response.interface';
import { TimeSlot } from '../../../shared/models/timeslot.interface';
import {
  formatSlotDateLabel,
  formatTimeDisplay,
  formatTimeRange,
  getSlotAvailabilityStatus,
  SlotAvailabilityStatus
} from '../../../shared/utils/date-time.util';

export interface ClinicServiceItem {
  id: number;
  name: string;
  durationMins: number;
  priceEgp: number;
}

@Component({
  selector: 'app-clinic-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PatientFooterComponent,
    Navbar,
    ToastComponent
  ],
  templateUrl: './clinic-details.html',
  styleUrl: './clinic-details.scss'
})
export class ClinicDetails implements OnInit {

  clinics: ClinicResponse[] = [];
  filteredClinics: ClinicResponse[] = [];

  loading: boolean = false;
  bookingLoading: boolean = false;

  error: string | null = null;

  selectedClinic: ClinicResponse | null = null;
  selectedSlotId: number | null = null;

  availableTimeSlots: TimeSlot[] = [];
  showAllTimeSlots: boolean = false;
  private readonly visibleSlotLimit = 6;

  showTimeSlotsModal: boolean = false;

  searchTerm: string = '';

  viewMode: 'list' | 'details' = 'list';

  get selectedTimeSlot(): TimeSlot | null {
    if (this.selectedSlotId == null) {
      return null;
    }

    return this.availableTimeSlots.find((slot) => slot.id === this.selectedSlotId) ?? null;
  }

  get visibleTimeSlots(): TimeSlot[] {
    return this.showAllTimeSlots
      ? this.availableTimeSlots
      : this.availableTimeSlots.slice(0, this.visibleSlotLimit);
  }

  get hiddenSlotCount(): number {
    return Math.max(this.availableTimeSlots.length - this.visibleSlotLimit, 0);
  }

  constructor(
    private clinicService: ClinicService,
    private appointmentService: AppointmentService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    console.log('🚀 ClinicDetails initialized');

    // Safe defaults
    this.loading = true;
    this.error = null;
    this.viewMode = 'list';
    this.selectedClinic = null;
    this.clinics = [];
    this.filteredClinics = [];

    // Listen to route params
    this.route.paramMap.subscribe(params => {

      const clinicId = params.get('id');

      console.log('📌 Route clinic ID:', clinicId);

      if (clinicId) {

        this.viewMode = 'details';

        this.loadClinicById(Number(clinicId));

      } else {

        this.viewMode = 'list';

        this.loadClinics();
      }
    });
  }

  // =========================
  // LOAD ALL CLINICS
  // =========================

  loadClinics(): void {

    console.log('🔄 Starting loadClinics()');

    this.loading = true;
    this.error = null;
    this.selectedClinic = null;

    this.cdr.detectChanges();

    this.clinicService.getAllClinics({}).subscribe({

      next: (data: ClinicResponse[]) => {

        console.log('✅ API response received:', data);

        // IMPORTANT FIXES
        this.clinics = data || [];
        this.filteredClinics = [...this.clinics];

        // STOP LOADING
        this.loading = false;

        console.log('📊 Clinics loaded:', this.clinics.length);

        this.cdr.detectChanges();
      },

      error: (err) => {

        console.error('❌ Error loading clinics:', err);

        this.error = 'Failed to load clinics. Please try again later.';

        this.loading = false;

        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // LOAD CLINIC BY ID
  // =========================

  loadClinicById(id: number): void {

    console.log('🔄 Loading clinic by ID:', id);

    this.loading = true;
    this.error = null;

    this.clinics = [];
    this.filteredClinics = [];

    this.cdr.detectChanges();

    this.clinicService.getClinicsById(id).subscribe({

      next: (clinic: ClinicResponse) => {

        console.log('✅ Clinic details loaded:', clinic);

        this.selectedClinic = clinic;

        this.clinics = [clinic];
        this.filteredClinics = [clinic];

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (err) => {

        console.error('❌ Error loading clinic details:', err);

        this.error = 'Failed to load clinic details. Please try again later.';

        this.loading = false;

        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // NAVIGATION
  // =========================

  selectClinic(clinic: ClinicResponse): void {

    if (!clinic?.id) {
      return;
    }

    console.log('📌 Selected clinic:', clinic.id);

    this.router.navigate(['/clinic-details', clinic.id]);
  }

  viewClinicDetails(clinic: ClinicResponse): void {
    this.selectClinic(clinic);
  }

  backToList(): void {

    this.router.navigate(['/clinic-details']);
  }

  // =========================
  // SEARCH
  // =========================

  onSearch(): void {

    console.log('🔍 Search term:', this.searchTerm);

    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {

      this.filteredClinics = [...this.clinics];
      return;
    }

    this.filteredClinics = this.clinics.filter(clinic =>
      clinic.clinicName?.toLowerCase().includes(term) ||
      clinic.clinicAddress?.toLowerCase().includes(term) ||
      clinic.doctorName?.toLowerCase().includes(term)
    );

    console.log('🔍 Filtered clinics:', this.filteredClinics);
  }

  clearSearch(): void {

    this.searchTerm = '';

    this.filteredClinics = [...this.clinics];
  }

  // =========================
  // SERVICES
  // =========================

  selectService(service: ClinicServiceItem): void {

    console.log('🩺 Selected service:', service);
  }

  // =========================
  // BOOKING MODAL
  // =========================

  openBookingModal(clinic: ClinicResponse): void {

    console.log('🔄 Opening booking modal:', clinic);

    if (!clinic || !clinic.id) {

      console.error('❌ Invalid clinic');

      this.toastService.error('Invalid clinic selected');

      return;
    }

    this.selectedClinic = clinic;
    this.selectedSlotId = null;
    this.showAllTimeSlots = false;

    this.showTimeSlotsModal = true;

    this.loadAvailableTimeSlots(clinic.id);
  }

  closeBookingModal(): void {

    this.showTimeSlotsModal = false;

    this.selectedSlotId = null;
    this.showAllTimeSlots = false;

    this.availableTimeSlots = [];
  }

  // =========================
  // LOAD TIME SLOTS
  // =========================

  loadAvailableTimeSlots(clinicId: number): void {

    console.log('🔄 Loading time slots for clinic:', clinicId);

    this.clinicService.getAvailableSlots(clinicId).subscribe({

      next: (timeSlots: TimeSlot[]) => {

        console.log('✅ Time slots loaded:', timeSlots);

        this.availableTimeSlots = timeSlots
          .map((slot) => this.normalizeTimeSlot(slot))
          .sort((a, b) => this.getSlotSortValue(a) - this.getSlotSortValue(b));
        this.selectedSlotId = null;
        this.showAllTimeSlots = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error('❌ Error loading time slots:', error);

        this.toastService.error(
          'Failed to load available time slots'
        );

        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // SELECT SLOT
  // =========================

  selectTimeSlot(timeSlot: TimeSlot, event?: Event): void {
    event?.stopPropagation();

    if (this.isSlotDisabled(timeSlot)) {
      return;
    }

    this.selectedSlotId = this.selectedSlotId === timeSlot.id ? null : timeSlot.id;
  }

  isSlotSelected(slot: TimeSlot): boolean {
    return this.selectedSlotId === slot.id;
  }

  isSlotDisabled(slot: TimeSlot): boolean {
    return !this.canSelectSlot(slot) && !this.isSlotSelected(slot);
  }

  toggleShowAllTimeSlots(event: Event): void {
    event.stopPropagation();
    this.showAllTimeSlots = !this.showAllTimeSlots;
  }

  onSlotKeydown(event: KeyboardEvent, slot: TimeSlot): void {
    const key = event.key;

    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      this.selectTimeSlot(slot, event);
      return;
    }

    const isForward = key === 'ArrowRight' || key === 'ArrowDown';
    const isBackward = key === 'ArrowLeft' || key === 'ArrowUp';

    if (!isForward && !isBackward) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const currentButton = event.currentTarget as HTMLButtonElement | null;
    const slotGroup = currentButton?.closest('.slot-pills-row');
    const slotButtons = Array.from(
      slotGroup?.querySelectorAll<HTMLButtonElement>('.slot-pill:not(:disabled)') ?? []
    );
    const currentIndex = currentButton ? slotButtons.indexOf(currentButton) : -1;

    if (currentIndex === -1 || slotButtons.length === 0) {
      return;
    }

    const direction = isForward ? 1 : -1;
    const nextIndex = (currentIndex + direction + slotButtons.length) % slotButtons.length;
    slotButtons[nextIndex]?.focus();
  }

  trackBySlot(_index: number, slot: TimeSlot): number {
    return slot.id;
  }

  slotButtonDelay(index: number): string {
    return `${Math.min(index, 16) * 50}ms`;
  }

  getSlotAriaLabel(slot: TimeSlot): string {
    const label = this.getSlotDisplayLabel(slot);
    return label ? `Select ${label} slot` : 'Select time slot';
  }

  getSlotDisplayLabel(slot: TimeSlot): string | null {
    const range = this.getSlotTimeRange(slot);
    return range ? `${range.start} ${range.period}` : null;
  }

  getSlotDateLabel(slot: TimeSlot): string | null {
    return formatSlotDateLabel(slot.date) ?? formatSlotDateLabel(slot.startTime);
  }

  getSlotTimeRange(slot: TimeSlot): { start: string; end: string; period: string } | null {
    const range = formatTimeRange(slot.startTime, slot.endTime);
    if (range) {
      return range;
    }

    const start = formatTimeDisplay(slot.startTime);
    if (!start) {
      return null;
    }

    return { start: start.time, end: '', period: start.period };
  }

  getSlotStatus(slot: TimeSlot): SlotAvailabilityStatus {
    const available =
      slot.availableCount ?? Math.max((slot.capacity ?? 0) - (slot.bookedCount ?? 0), 0);
    return getSlotAvailabilityStatus(available, slot.capacity ?? 0);
  }

  canSelectSlot(slot: TimeSlot): boolean {
    return this.getSlotStatus(slot) !== 'booked';
  }

  private getSlotSortValue(slot: TimeSlot): number {
    const parsed = new Date(slot.startTime);
    const parsedTime = parsed.getTime();
    return Number.isNaN(parsedTime) ? Number.MAX_SAFE_INTEGER : parsedTime;
  }

  private normalizeTimeSlot(slot: TimeSlot): TimeSlot {
    const capacity = slot.capacity ?? 0;
    const bookedCount = slot.bookedCount ?? 0;
    const availableCount =
      slot.availableCount ?? Math.max(capacity - bookedCount, 0);

    return {
      ...slot,
      capacity,
      bookedCount,
      availableCount
    };
  }

  // =========================
  // BOOK APPOINTMENT
  // =========================

  bookAppointment(): void {

    const selectedTimeSlot = this.selectedTimeSlot;

    if (!selectedTimeSlot) {

      this.toastService.error(
        'Please select a time slot'
      );

      return;
    }

    this.bookingLoading = true;

    console.log(
      '🔄 Booking appointment:',
      selectedTimeSlot.id
    );

    this.cdr.detectChanges();

    this.appointmentService
      .bookAppointment(selectedTimeSlot.id)
      .subscribe({

        next: (response) => {

          console.log(
            '✅ Appointment booked:',
            response
          );

          this.toastService.success(
            'Booked successfully!'
          );

          this.closeBookingModal();

          this.bookingLoading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            '❌ Booking failed:',
            error
          );

          const errorMessage =
            error?.message || 'Booking failed';

          this.toastService.error(
            `Booking failed: ${errorMessage}`
          );

          this.bookingLoading = false;

          this.cdr.detectChanges();
        }
      });
  }

}
