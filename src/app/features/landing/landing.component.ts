import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  readonly stats = [
    { value: '24/7', label: 'Access to care requests' },
    { value: '3', label: 'Workspaces for patients, doctors, admins' },
    { value: '1', label: 'Connected medical platform' }
  ];

  readonly services = [
    {
      icon: 'fa-hospital-user',
      title: 'Find trusted clinics',
      text: 'Browse verified clinics, doctor details, locations, and available booking options.'
    },
    {
      icon: 'fa-calendar-check',
      title: 'Book with confidence',
      text: 'Patients can reserve appointments and keep track of upcoming or past visits.'
    },
    {
      icon: 'fa-user-doctor',
      title: 'Doctor workspace',
      text: 'Doctors manage their clinics, schedules, slots, and appointment activity in one place.'
    },
    {
      icon: 'fa-shield-halved',
      title: 'Admin control',
      text: 'Admins can supervise doctors, review platform activity, and keep records organized.'
    }
  ];

  readonly steps = [
    'Create a patient account',
    'Choose a clinic and time slot',
    'Manage appointments from your profile'
  ];

  readonly testimonials = [
    {
      rating: 5,
      text: 'MedGuid made it so easy to find a doctor and book an appointment. The interface is intuitive and the process was seamless.',
      name: 'Sarah Ahmed',
      role: 'Patient'
    },
    {
      rating: 5,
      text: 'As a busy professional, I appreciate how quickly I can schedule appointments. The reminder system is also very helpful.',
      name: 'Mohamed Hassan',
      role: 'Patient'
    },
    {
      rating: 4,
      text: 'Great platform for managing my family\'s healthcare needs. The clinic information is detailed and accurate.',
      name: 'Fatima Ali',
      role: 'Patient'
    }
  ];

  readonly doctorFeatures = [
    {
      icon: 'fa-clinic-medical',
      title: 'Manage multiple clinics',
      text: 'Add and manage multiple clinic locations with ease. Update details, services, and availability in one place.'
    },
    {
      icon: 'fa-clock',
      title: 'Flexible time slots',
      text: 'Create and manage time slots based on your schedule. Set capacity and pricing for each slot.'
    },
    {
      icon: 'fa-calendar-days',
      title: 'Appointment management',
      text: 'View and manage all your appointments in one dashboard. Track upcoming, past, and cancelled bookings.'
    },
    {
      icon: 'fa-chart-line',
      title: 'Analytics dashboard',
      text: 'Track your clinic performance with detailed analytics. Monitor bookings, revenue, and patient feedback.'
    }
  ];
}
