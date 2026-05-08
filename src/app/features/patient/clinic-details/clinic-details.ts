import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';

import { PatientFooterComponent } from '../../../shared/components/patient-footer/patient-footer.component';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { ToastComponent } from '../../../shared/components/toast/toast.component';

import { ClinicService } from '../../../core/services/clinic.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ToastService } from '../../../core/services/toast.service';

import { ClinicResponse } from '../../../shared/models/clinic-response.interface';
import { TimeSlot } from '../../../shared/models/timeslot.interface';

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
    RouterLink,
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
  selectedTimeSlot: TimeSlot | null = null;

  availableTimeSlots: TimeSlot[] = [];

  showTimeSlotsModal: boolean = false;

  searchTerm: string = '';

  viewMode: 'list' | 'details' = 'list';

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

    this.showTimeSlotsModal = true;

    this.loadAvailableTimeSlots(clinic.id);
  }

  closeBookingModal(): void {

    this.showTimeSlotsModal = false;

    this.selectedTimeSlot = null;

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

        this.availableTimeSlots = timeSlots.filter(
          slot => slot.availableCount > 0
        );

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

  selectTimeSlot(timeSlot: TimeSlot): void {

    this.selectedTimeSlot = timeSlot;

    console.log('📅 Selected slot:', timeSlot);
  }

  // =========================
  // BOOK APPOINTMENT
  // =========================

  bookAppointment(): void {

    if (!this.selectedTimeSlot) {

      this.toastService.error(
        'Please select a time slot'
      );

      return;
    }

    this.bookingLoading = true;

    console.log(
      '🔄 Booking appointment:',
      this.selectedTimeSlot.id
    );

    this.cdr.detectChanges();

    this.appointmentService
      .bookAppointment(this.selectedTimeSlot.id)
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

  // =========================
  // FORMAT DATE
  // =========================

  formatDateTime(date: string, time: string): string {

    const dateObj = new Date(date);

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    return (
      dateObj
        .toLocaleDateString('en-US', options)
        .replace(',', '') +
      ' - ' +
      time
    );
  }
}