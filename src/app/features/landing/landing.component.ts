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
}
