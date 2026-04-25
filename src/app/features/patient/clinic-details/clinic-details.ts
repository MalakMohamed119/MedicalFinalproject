import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PatientFooterComponent } from '../../../shared/components/patient-footer/patient-footer.component';
import { Navbar } from '../../../shared/components/navbar/navbar';

export interface ClinicServiceItem {
  id: number;
  name: string;
  durationMins: number;
  priceEgp: number;
}

@Component({
  selector: 'app-clinic-details',
  standalone: true,
  imports: [CommonModule, RouterLink, PatientFooterComponent, Navbar],
  templateUrl: './clinic-details.html',
  styleUrl: './clinic-details.scss'
})
export class ClinicDetails {
  readonly clinicName = 'Modern Dental Clinic';
  readonly doctorName = 'Dr. Malak Mohamed';
  readonly address = '15 Cleopatra St., Heliopolis, Cairo';
  readonly openingHours = 'Sun–Thu: 9:00 AM – 8:00 PM\nFri: 10:00 AM – 4:00 PM';

  readonly services: ClinicServiceItem[] = [
    { id: 1, name: 'General Consultation', durationMins: 30, priceEgp: 350 },
    { id: 2, name: 'Follow-up Visit', durationMins: 20, priceEgp: 200 },
    { id: 3, name: 'Teeth Cleaning & Polish', durationMins: 45, priceEgp: 550 },
    { id: 4, name: 'X-Ray & Assessment', durationMins: 25, priceEgp: 400 }
  ];

  selectService(service: ClinicServiceItem): void {
    // UI-only for now
    console.log('Selected service:', service.id);
  }
}
