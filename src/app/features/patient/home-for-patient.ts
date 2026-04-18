import { Component, OnInit, inject } from '@angular/core';
import { Footer } from '../../shared/components/footer/footer';
import { Navbar } from '../../shared/components/navbar/navbar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicResponse } from '../../shared/models/clinic-response.interface';
import { ClinicService } from '../../core/services/clinic.service';

type ClinicCard = ClinicResponse & {
  rating: number;
  availableSlots: number;
  image: string;
  specialty: string;
};

@Component({
  selector: 'app-home-for-patient',
  standalone: true,
  imports: [CommonModule, FormsModule, Footer, Navbar],
  templateUrl: './home-for-patient.html',
  styleUrl: './home-for-patient.scss'
})
export class HomeForPatient implements OnInit {
  private clinicService = inject(ClinicService);
  readonly starNumbers: number[] = [1, 2, 3, 4, 5];

  clinics: ClinicCard[] = [];
  filteredClinics: ClinicCard[] = [];
  searchTerm: string = '';
  stats = {
    totalClinics: 0,
    totalDoctors: 23,
    happyPatients: 1247
  };
  isLoading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadClinics();
  }

  loadClinics(): void {
    this.isLoading = true;
    this.error = null;
    this.clinicService.getAllClinics({}).subscribe({
      next: (data: ClinicResponse[]) => {
        this.clinics = data.map((clinic: ClinicResponse) => ({
          ...clinic,
          rating: 4.8,
          availableSlots: 10,
          image: 'assets/images/clinic-placeholder.jpg',
          specialty: 'Medical Specialist'
        }));
        this.filteredClinics = [...this.clinics];
        this.stats.totalClinics = this.clinics.length;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Failed to load clinics:', err);
        this.error = 'Failed to load clinics';
        this.isLoading = false;
      }
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
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

  isStarFilled(rating: number, starNumber: number): boolean {
    const r = Math.min(5, Math.max(0, rating));
    return starNumber <= Math.round(r);
  }

trackByClinic(index: number, clinic: ClinicCard): number {
    return clinic.id;
  }
}
