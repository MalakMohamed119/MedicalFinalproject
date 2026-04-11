import { Component, OnInit } from '@angular/core';
import { Footer } from '../../shared/components/footer/footer';
import { Navbar } from '../../shared/components/navbar/navbar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicService } from '../../core/services/clinic.service';
import { ClinicResponse } from '../../shared/models/clinic-response.interface';

@Component({
  selector: 'app-home-for-patient',
  standalone: true,
  imports: [CommonModule, FormsModule, Footer, Navbar],
  templateUrl: './home-for-patient.html',
  styleUrl: './home-for-patient.scss'
})
export class HomeForPatient implements OnInit {
  clinics: (ClinicResponse & { rating: number; availableSlots: number; image: string })[] = [];
  filteredClinics: (ClinicResponse & { rating: number; availableSlots: number; image: string })[] = [];
  searchTerm: string = '';
  stats = {
    totalClinics: 47,
    totalDoctors: 23,
    happyPatients: 1247
  };

  constructor(private clinicService: ClinicService) {}

  ngOnInit(): void {
    this.clinics = [
      { 
        id: 1, 
        doctorId: '1', 
        clinicName: 'Modern Dental Clinic', 
        doctorName: 'Dr. Malak Mohamed', 
        clinicAddress: 'Heliopolis, Cairo', 
        description: 'Advanced dental care',
        rating: 4.9,
        availableSlots: 12,
        image: ''
      },
      { 
        id: 2, 
        doctorId: '2', 
        clinicName: 'Heart & Soul Center', 
        doctorName: 'Dr. Ahmed Mostafa', 
        clinicAddress: 'Maadi, Cairo', 
        description: 'Expert cardiac services',
        rating: 4.8,
        availableSlots: 8,
        image: ''
      },
      { 
        id: 3, 
        doctorId: '3', 
        clinicName: 'Global Eye Care', 
        doctorName: 'Dr. Sarah Hassan', 
        clinicAddress: 'Zamalek, Cairo', 
        description: 'Precision eye surgery',
        rating: 5.0,
        availableSlots: 15,
        image: ''
      },
      { 
        id: 4, 
        doctorId: '4', 
        clinicName: 'Elite Medical Center', 
        doctorName: 'Dr. Sara Ahmed', 
        clinicAddress: 'Nasr City, Cairo', 
        description: 'Comprehensive healthcare',
        rating: 4.7,
        availableSlots: 20,
        image: ''
      },
      { 
        id: 5, 
        doctorId: '5', 
        clinicName: 'Prime Pediatrics', 
        doctorName: 'Dr. Omar Khaled', 
        clinicAddress: 'New Cairo, Cairo', 
        description: 'Child healthcare specialists',
        rating: 4.9,
        availableSlots: 10,
        image: ''
      },
      { 
        id: 6, 
        doctorId: '6', 
        clinicName: 'Vision Care Institute', 
        doctorName: 'Dr. Layla Ibrahim', 
        clinicAddress: 'Dokki, Cairo', 
        description: 'Advanced eye treatments',
        rating: 4.8,
        availableSlots: 14,
        image: ''
      }
    ];
    this.filteredClinics = [...this.clinics];
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredClinics = [...this.clinics];
      return;
    }
    
    this.filteredClinics = this.clinics.filter(clinic =>
      clinic.clinicName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      clinic.doctorName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      clinic.clinicAddress.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  bookClinic(id: number): void {
    console.log('Booking clinic:', id);
  }

  getStars(rating: number): boolean[] {
    return Array(5).fill(0).map((_, i) => i < Math.floor(rating));
  }

  getEmptyStars(rating: number): boolean[] {
    const filled = Math.floor(rating);
    return Array(5).fill(0).map((_, i) => i >= filled);
  }

  trackByClinic(index: number, clinic: any): any {
    return clinic.id;
  }
}
