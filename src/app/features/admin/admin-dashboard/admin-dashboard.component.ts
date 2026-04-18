import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface AdminStatCard {
  id: string;
  label: string;
  value: string;
  deltaLabel: string;
  /** Green for growth, muted for neutral/down */
  deltaTone: 'positive' | 'negative' | 'neutral';
  icon: string;
}

export interface RecentAppointmentRow {
  patientName: string;
  service: string;
  timeLabel: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}

export interface TopClinicItem {
  name: string;
  subtitle: string;
  initials: string;
  rating: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboard {
  /** Mobile / tablet drawer */
  readonly sidebarOpen = signal(false);

  readonly stats: AdminStatCard[] = [
    {
      id: 'patients',
      label: 'Total Patients',
      value: '12,847',
      deltaLabel: '+12% this month',
      deltaTone: 'positive',
      icon: 'bi-people'
    },
    {
      id: 'today',
      label: "Today's Appointments",
      value: '186',
      deltaLabel: '+8% vs yesterday',
      deltaTone: 'positive',
      icon: 'bi-calendar-check'
    },
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: 'EGP 428K',
      deltaLabel: '+15% this month',
      deltaTone: 'positive',
      icon: 'bi-graph-up-arrow'
    },
    {
      id: 'pending',
      label: 'Pending Requests',
      value: '23',
      deltaLabel: '−4% vs last week',
      deltaTone: 'negative',
      icon: 'bi-inbox'
    }
  ];

  readonly recentAppointments: RecentAppointmentRow[] = [
    { patientName: 'Layla Hassan', service: 'General Consultation', timeLabel: 'Today · 10:30 AM', status: 'Confirmed' },
    { patientName: 'Omar Khaled', service: 'Cardiology Follow-up', timeLabel: 'Today · 11:15 AM', status: 'Pending' },
    { patientName: 'Sara Ahmed', service: 'Dental Cleaning', timeLabel: 'Today · 2:00 PM', status: 'Confirmed' },
    { patientName: 'Malak Mohamed', service: 'Eye Exam', timeLabel: 'Today · 3:45 PM', status: 'Cancelled' },
    { patientName: 'Youssef Ali', service: 'Pediatrics', timeLabel: 'Today · 4:30 PM', status: 'Pending' },
    { patientName: 'Nour Ibrahim', service: 'Physiotherapy', timeLabel: 'Today · 5:00 PM', status: 'Confirmed' }
  ];

  readonly topClinics: TopClinicItem[] = [
    { name: 'Modern Dental Clinic', subtitle: 'Heliopolis · Cairo', initials: 'MD', rating: 4.9 },
    { name: 'Heart & Soul Center', subtitle: 'Maadi · Cairo', initials: 'HS', rating: 4.8 },
    { name: 'Global Eye Care', subtitle: 'Zamalek · Cairo', initials: 'GE', rating: 5.0 },
    { name: 'Elite Medical Center', subtitle: 'Nasr City · Cairo', initials: 'EM', rating: 4.7 },
    { name: 'Prime Pediatrics', subtitle: 'New Cairo', initials: 'PP', rating: 4.9 }
  ];

  readonly starSlots = [1, 2, 3, 4, 5];

  isStarFilled(rating: number, star: number): boolean {
    return star <= Math.round(rating);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.sidebarOpen()) {
      this.closeSidebar();
    }
  }
}
