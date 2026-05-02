import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterLink, PatientFooterComponent, Navbar, ToastComponent],
  templateUrl: './clinic-details.html',
  styleUrl: './clinic-details.scss'
})
export class ClinicDetails implements OnInit {
  clinics: ClinicResponse[] = [];
  selectedClinic: ClinicResponse | null = null;
  loading: boolean = true;
  error: string | null = null;
  viewMode: 'list' | 'details' = 'list';
  
  // Appointment booking properties
  availableTimeSlots: TimeSlot[] = [];
  selectedTimeSlot: TimeSlot | null = null;
  bookingLoading: boolean = false;
  showTimeSlotsModal: boolean = false;

  constructor(
    private clinicService: ClinicService,
    private appointmentService: AppointmentService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initialize with safe defaults
    this.loading = true;
    this.error = null;
    this.viewMode = 'list';
    this.selectedClinic = null;
    this.clinics = [];
    
    // Check if we have an ID parameter for individual clinic view
    this.route.paramMap.subscribe(params => {
      const clinicId = params.get('id');
      if (clinicId) {
        this.viewMode = 'details';
        this.loadClinicById(parseInt(clinicId));
      } else {
        this.viewMode = 'list';
        this.loadClinics();
      }
    });
  }

  loadClinics(): void {
    console.log('🔄 Starting loadClinics()');
    this.loading = true;
    this.error = null;
    this.selectedClinic = null;
    console.log('📊 Before API call - loading:', this.loading, 'clinics:', this.clinics);
    
    this.clinicService.getAllClinics({}).subscribe({
      next: (data) => {
        console.log('✅ API response received:', data);
        console.log('📊 Data type:', typeof data);
        console.log('📊 Is array:', Array.isArray(data));
        console.log('📊 Data length:', data?.length);
        
        this.clinics = data;
        this.loading = false;
        
        console.log('📊 After assignment - clinics:', this.clinics);
        console.log('📊 Clinics length after assignment:', this.clinics.length);
        console.log('📊 Loading state after assignment:', this.loading);
        console.log('✅ Clinics loaded successfully:', data);
      },
      error: (err) => {
        console.error('❌ Error loading clinics:', err);
        this.error = 'Failed to load clinics. Please try again later.';
        this.loading = false;
      }
    });
  }

  loadClinicById(id: number): void {
    this.loading = true;
    this.error = null;
    this.clinics = [];
    
    this.clinicService.getClinicsById(id).subscribe({
      next: (clinic) => {
        this.selectedClinic = clinic;
        this.loading = false;
        console.log('Clinic details loaded successfully:', clinic);
      },
      error: (err) => {
        console.error('❌ Error loading clinic details:', err);
        this.error = 'Failed to load clinic details. Please try again later.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectClinic(clinic: ClinicResponse): void {
    // Navigate to individual clinic details view
    this.router.navigate(['/clinic-details', clinic.id]);
  }

  viewClinicDetails(clinic: ClinicResponse): void {
    this.selectClinic(clinic);
  }

  backToList(): void {
    this.router.navigate(['/clinic-details']);
  }

  selectService(service: ClinicServiceItem): void {
    // UI-only for now
    console.log('Selected service:', service.id);
  }

  // Appointment booking methods
  openBookingModal(clinic: ClinicResponse): void {
    console.log('🔄 Opening booking modal with clinic:', clinic);
    
    if (!clinic) {
      console.error('❌ Clinic is undefined');
      this.toastService.error('Invalid clinic selected');
      return;
    }
    
    if (!clinic.id) {
      console.error('❌ Clinic ID is undefined');
      this.toastService.error('Invalid clinic selected');
      return;
    }
    
    this.selectedClinic = clinic;
    this.showTimeSlotsModal = true;
    this.loadAvailableTimeSlots(clinic.id);
  }

  loadAvailableTimeSlots(clinicId: number): void {
    console.log('🔄 Loading available time slots for clinic:', clinicId);
    
    this.clinicService.getAvailableSlots(clinicId).subscribe({
      next: (timeSlots) => {
        console.log('✅ Time slots loaded:', timeSlots);
        this.availableTimeSlots = timeSlots.filter(slot => slot.availableCount > 0);
        console.log('📊 Available time slots:', this.availableTimeSlots);
      },
      error: (error) => {
        console.error('❌ Error loading time slots:', error);
        this.toastService.error('Failed to load available time slots');
      }
    });
  }

  selectTimeSlot(timeSlot: TimeSlot): void {
    this.selectedTimeSlot = timeSlot;
    console.log('📅 Selected time slot:', timeSlot);
  }

  bookAppointment(): void {
    if (!this.selectedTimeSlot) {
      this.toastService.error('Please select a time slot');
      return;
    }

    this.bookingLoading = true;
    console.log('🔄 Booking appointment with timeSlotId:', this.selectedTimeSlot.id);

    this.appointmentService.bookAppointment(this.selectedTimeSlot.id).subscribe({
      next: (response) => {
        console.log('✅ Appointment booked successfully:', response);
        this.toastService.success('Booked successfully!');
        this.closeBookingModal();
        this.bookingLoading = false;
      },
      error: (error) => {
        console.error('❌ Booking failed:', error);
        const errorMessage = error.message || 'Booking failed';
        this.toastService.error(`Booking failed: ${errorMessage}`);
        this.bookingLoading = false;
      }
    });
  }

  closeBookingModal(): void {
    this.showTimeSlotsModal = false;
    this.selectedTimeSlot = null;
    this.availableTimeSlots = [];
  }

  formatDateTime(date: string, time: string): string {
    const dateObj = new Date(date);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return dateObj.toLocaleDateString('en-US', options).replace(',', '') + ' - ' + time;
  }
}
