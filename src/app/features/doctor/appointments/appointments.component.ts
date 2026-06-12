import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { Navbar } from '../../../shared/components/navbar/navbar';
import { DoctorFooterComponent } from '../../../shared/components/doctor-footer/doctor-footer.component';

import { AppointmentService } from '../../../core/services/appointment.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { PatientService } from '../../../core/services/patient.service';

import { forkJoin, of, TimeoutError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

type AppointmentStatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'rejected';
type AppointmentDateFilter = 'today' | 'tomorrow' | 'upcoming' | 'others';

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    DoctorFooterComponent
  ],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class DoctorAppointments implements OnInit {
  appointments: any[] = [];

  loading: boolean = false;

  error: string | null = null;

  updatingAppointmentId: number | null = null;

  activeStatusFilter: AppointmentStatusFilter = 'all';

  activeDateFilter: AppointmentDateFilter = 'today';

  pendingStatusAction: { appointmentId: number; status: string } | null = null;

  selectedAppointment: any | null = null;

  tabAnimating = false;

  get pendingActionStatus(): string {
    return this.pendingStatusAction?.status || '';
  }

  get isRejectAction(): boolean {
    return this.pendingActionStatus === 'Rejected';
  }

  constructor(
    private appointmentService: AppointmentService,
    private clinicService: ClinicService,
    private patientService: PatientService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  // =========================================
  // DERIVED APPOINTMENTS
  // =========================================

  get allAppointments(): any[] {
    return this.appointments;
  }

  get pendingAppointments(): any[] {
    return this.appointments.filter(a => a.status === 'Pending');
  }

  get confirmedAppointments(): any[] {
    return this.appointments.filter(a => a.status === 'Confirmed');
  }

  get completedAppointments(): any[] {
    return this.appointments.filter(a => a.status === 'Completed');
  }

  get cancelledAppointments(): any[] {
    return this.appointments.filter(a => a.status === 'Rejected' || a.status === 'Cancelled' || a.status === 'NoShow');
  }

  get todayAppointments(): any[] {
    return this.appointments.filter((appointment) => {
      const date = this.getAppointmentDate(appointment);
      return date ? this.isToday(date) : false;
    });
  }

  get upcomingAppointments(): any[] {
    return this.appointments.filter((appointment) => {
      const date = this.getAppointmentDate(appointment);
      if (!date) {
        return false;
      }

      const today = this.startOfDay(new Date());
      return date >= this.addDays(today, 2);
    });
  }

  get tomorrowAppointments(): any[] {
    return this.appointments.filter((appointment) => {
      const date = this.getAppointmentDate(appointment);
      return date ? this.isTomorrow(date) : false;
    });
  }

  get otherAppointments(): any[] {
    return this.appointments.filter((appointment) => this.getDateGroupLabel(appointment) === 'Other');
  }

  get appointmentSummaryLabel(): string {
    switch (this.activeStatusFilter) {
      case 'pending':
        return 'Pending appointments';
      case 'confirmed':
        return 'Confirmed appointments';
      case 'completed':
        return 'Completed appointments';
      case 'rejected':
        return 'Rejected / cancelled';
      default:
        return 'Total appointments';
    }
  }

  get statusFilteredAppointments(): any[] {
    switch (this.activeStatusFilter) {
      case 'pending':
        return this.pendingAppointments;
      case 'confirmed':
        return this.confirmedAppointments;
      case 'completed':
        return this.completedAppointments;
      case 'rejected':
        return this.cancelledAppointments;
      default:
        return this.allAppointments;
    }
  }

  get visibleAppointments(): any[] {
    return this.statusFilteredAppointments.filter((appointment) => {
      switch (this.activeDateFilter) {
        case 'today':
          return this.getDateGroupLabel(appointment) === 'Today';
        case 'tomorrow':
          return this.getDateGroupLabel(appointment) === 'Tomorrow';
        case 'upcoming':
          return this.getDateGroupLabel(appointment) === 'Upcoming';
        case 'others':
          return this.getDateGroupLabel(appointment) === 'Other';
      }
    });
  }

  get todayTabAppointments(): any[] {
    return this.statusFilteredAppointments.filter((appointment) => this.getDateGroupLabel(appointment) === 'Today');
  }

  get tomorrowTabAppointments(): any[] {
    return this.statusFilteredAppointments.filter((appointment) => this.getDateGroupLabel(appointment) === 'Tomorrow');
  }

  get upcomingTabAppointments(): any[] {
    return this.statusFilteredAppointments.filter((appointment) => this.getDateGroupLabel(appointment) === 'Upcoming');
  }

  get otherTabAppointments(): any[] {
    return this.statusFilteredAppointments.filter((appointment) => this.getDateGroupLabel(appointment) === 'Other');
  }

  get groupedVisibleAppointments(): Array<{ label: string; appointments: any[] }> {
    const order = ['Today', 'Tomorrow', 'Upcoming', 'Other'];
    const groups = new Map<string, any[]>();

    for (const appointment of this.visibleAppointments) {
      const label = this.getDateGroupLabel(appointment);
      const bucket = groups.get(label) ?? [];
      bucket.push(appointment);
      groups.set(label, bucket);
    }

    return order
      .filter((label) => (groups.get(label)?.length ?? 0) > 0)
      .map((label) => ({ label, appointments: groups.get(label)! }));
  }

  get emptyTabTitle(): string {
    const dateLabel = this.activeDateFilterLabel.toLowerCase();

    switch (this.activeStatusFilter) {
      case 'pending':
        return `No pending appointments for ${dateLabel}`;
      case 'confirmed':
        return `No confirmed appointments for ${dateLabel}`;
      case 'completed':
        return `No completed appointments for ${dateLabel}`;
      case 'rejected':
        return `No rejected appointments for ${dateLabel}`;
      default:
        return `No appointments for ${dateLabel}`;
    }
  }

  get emptyTabMessage(): string {
    switch (this.activeStatusFilter) {
      case 'pending':
        return 'New patient requests will appear here before you confirm or reject them.';
      case 'confirmed':
        return 'Confirmed visits will appear here until they are completed or cancelled.';
      case 'completed':
        return 'Completed visits will appear here after you mark appointments as done.';
      case 'rejected':
        return 'Rejected, cancelled, and no-show appointments will appear here.';
      default:
        return 'No patient appointments have been scheduled yet.';
    }
  }

  get activeDateFilterLabel(): string {
    switch (this.activeDateFilter) {
      case 'today':
        return 'Today';
      case 'tomorrow':
        return 'Tomorrow';
      case 'upcoming':
        return 'Upcoming';
      case 'others':
        return 'Others';
    }
  }

  // =========================================
  // TAB NAVIGATION
  // =========================================

  setStatusFilter(filter: AppointmentStatusFilter): void {
    if (this.activeStatusFilter === filter) {
      return;
    }

    this.tabAnimating = true;
    this.activeStatusFilter = filter;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.tabAnimating = false;
      this.cdr.detectChanges();
    }, 220);
  }

  setDateFilter(filter: AppointmentDateFilter): void {
    if (this.activeDateFilter === filter) {
      return;
    }

    this.tabAnimating = true;
    this.activeDateFilter = filter;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.tabAnimating = false;
      this.cdr.detectChanges();
    }, 220);
  }

  openAppointmentDetail(appointment: any): void {
    this.selectedAppointment = appointment;
  }

  closeAppointmentDetail(): void {
    this.selectedAppointment = null;
  }

  rescheduleAppointment(): void {
    this.closeAppointmentDetail();
    this.router.navigate(['/doctor/manage-slots']);
  }

  getPatientInitials(name: string | undefined): string {
    const parts = String(name || 'Patient')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return 'P';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  private getAppointmentDate(appointment: any): Date | null {
    const dateValue = appointment?.date || appointment?.appointmentDate || appointment?.startTime;

    if (!dateValue) {
      return null;
    }

    const rawDate = String(dateValue);
    const date = rawDate.includes('T')
      ? new Date(rawDate)
      : new Date(`${rawDate}T00:00:00`);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  private isTomorrow(date: Date): boolean {
    return date.toDateString() === this.addDays(this.startOfDay(new Date()), 1).toDateString();
  }

  getDateGroupLabel(appointment: any): string {
    const date = this.getAppointmentDate(appointment);
    if (!date) {
      return 'Other';
    }

    if (this.isToday(date)) {
      return 'Today';
    }

    if (this.isTomorrow(date)) {
      return 'Tomorrow';
    }

    const today = this.startOfDay(new Date());
    if (date >= this.addDays(today, 2)) {
      return 'Upcoming';
    }

    return 'Other';
  }

  // =========================================
  // INIT
  // =========================================

  ngOnInit(): void {
    this.loadDoctorClinicAppointments();
  }

  // =========================================
  // GET CLINIC NAME BY ID
  // =========================================

  getClinicNameById(clinicId: number): Promise<string> {
    return new Promise((resolve) => {
      this.clinicService.getClinicsById(clinicId).subscribe({
        next: (clinic) => {
          resolve(clinic.clinicName || `Clinic ${clinicId}`);
        },
        error: () => {
          resolve(`Clinic ${clinicId}`);
        }
      });
    });
  }

  // =========================================
  // LOAD DOCTOR CLINIC APPOINTMENTS
  // =========================================

  loadDoctorClinicAppointments(): void {

    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.clinicService
      .getMyClinics()
      .pipe(timeout(10000))
      .subscribe({

        next: (clinics) => {
          if (clinics.length === 0) {
            this.appointments = [];
            this.loading = false;
            this.cdr.detectChanges();
            return;
          }

          const appointmentRequests = clinics.map((clinic) =>
            this.appointmentService.getClinicAppointmentsWithResolvedStatuses(clinic.id).pipe(
              catchError(() => of([]))
            )
          );

          forkJoin(appointmentRequests).subscribe({
            next: (groups) => {
              const basicAppointments = groups.flat().map((appointment: any) => {
                const clinic = clinics.find((item) => item.id === Number(appointment.clinicId));

                return {
                  ...appointment,
                  status: this.getStatusString(appointment.status),
                  clinicName: appointment.clinicName || clinic?.clinicName || `Clinic ${appointment.clinicId}`,
                  patientName: this.getDisplayPatientName(appointment.patientName) || 'Patient'
                };
              });

              if (basicAppointments.length === 0) {
                this.appointments = [];
                this.loading = false;
                this.cdr.detectChanges();
                return;
              }

              const patientNameRequests = basicAppointments.map((appointment) => {
                if (!this.shouldLoadPatientDetails(appointment)) {
                  return of(appointment);
                }

                return this.getPatientForAppointment(appointment).pipe(
                  map((patient) => ({
                    ...appointment,
                    patientName: this.extractPatientName(patient) || appointment.patientName,
                    patientDetails: this.extractPatientDetails(patient)
                  })),
                  catchError(() => of(appointment))
                );
              });

              forkJoin(patientNameRequests).subscribe({
                next: (appointments) => {
                  this.appointments = appointments;
                  this.loading = false;
                  this.cdr.detectChanges();
                },
                error: (err: any) => this.setLoadError(err)
              });
            },
            error: (err: any) => this.setLoadError(err)
          });
        },

        error: (err: any) => this.setLoadError(err)
      });
  }

  private setLoadError(err: any): void {
    if (err instanceof TimeoutError) {
      this.error = 'Request timed out. Try again.';
    } else if (err.status === 404) {
      this.error = 'No appointments found.';
    } else if (err.status === 401) {
      this.error = 'Please log in again.';
    } else {
      this.error = `Failed to load appointments (${err.status ?? 'unknown'}).`;
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  // =========================================
  // UPDATE APPOINTMENT STATUS
  // =========================================

  openStatusConfirm(appointmentId: number, newStatus: string): void {
    this.pendingStatusAction = { appointmentId, status: newStatus };
  }

  closeStatusConfirm(): void {
    this.pendingStatusAction = null;
  }

  confirmStatusUpdate(): void {
    const action = this.pendingStatusAction;

    if (!action) return;

    this.updateAppointmentStatus(action.appointmentId, action.status);
  }

  updateAppointmentStatus(appointmentId: number, newStatus: string): void {
    this.updatingAppointmentId = appointmentId;
    this.pendingStatusAction = null;
    this.cdr.detectChanges();

    this.appointmentService.updateAppointmentStatus(appointmentId, newStatus)
      .subscribe({

        next: () => {

          this.applyLocalAppointmentStatus(appointmentId, newStatus);

          this.updatingAppointmentId = null;
          if (this.selectedAppointment?.id === appointmentId) {
            this.selectedAppointment = this.appointments.find((item) => item.id === appointmentId) ?? null;
          }
          this.cdr.detectChanges();
        },

        error: () => {

          this.error = 'Failed to update appointment status. Please try again.';
          this.updatingAppointmentId = null;
          this.cdr.detectChanges();
        }
      });
  }

  // =========================================
  // STATUS MAPPING
  // =========================================

  getStatusString(status: number | string): string {
    if (typeof status === 'string') {
      const numericStatus = Number(status);
      if (Number.isFinite(numericStatus) && status.trim() !== '') {
        return this.getStatusString(numericStatus);
      }

      switch (status.trim().toLowerCase()) {
        case 'pending':
          return 'Pending';
        case 'confirmed':
          return 'Confirmed';
        case 'cancelled':
        case 'canceled':
        case 'rejected':
          return 'Rejected';
        case 'completed':
          return 'Completed';
        case 'noshow':
        case 'no show':
        case 'no-show':
          return 'NoShow';
        default:
          return status;
      }
    }

    if (typeof status === 'number') {

      switch (status) {
        case 0: return 'Pending';
        case 1: return 'Confirmed';
        case 2: return 'Rejected';
        case 3: return 'Completed';
        case 4: return 'NoShow';
        default: return 'Unknown';
      }
    }

    return status;
  }

  private applyLocalAppointmentStatus(appointmentId: number, status: string): void {
    this.appointments = this.appointments.map((appointment) =>
      appointment.id === appointmentId
        ? { ...appointment, status }
        : appointment
    );

    if (this.selectedAppointment?.id === appointmentId) {
      this.selectedAppointment = this.appointments.find((item) => item.id === appointmentId) ?? {
        ...this.selectedAppointment,
        status
      };
    }
  }

  canConfirm(status: string): boolean {
    return status === 'Pending';
  }

  canComplete(status: string): boolean {
    return status === 'Confirmed';
  }

  canReject(status: string): boolean {
    return status === 'Pending' || status === 'Confirmed';
  }

  // =========================================
  // FORMAT DATE
  // =========================================

  formatDate(dateString: string): string {

    if (!dateString) return 'N/A';

    const rawDate = String(dateString);
    const date = rawDate.includes('T')
      ? new Date(rawDate)
      : new Date(rawDate + 'T00:00:00');

    if (isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // =========================================
  // FORMAT TIME
  // =========================================

  formatTime(timeString: string): string {

    if (!timeString) return 'N/A';

    const parsedDate = new Date(timeString);
    if (!Number.isNaN(parsedDate.getTime()) && timeString.includes('T')) {
      return parsedDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    const parts = timeString.split(':');

    if (parts.length < 2) return 'N/A';

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return 'N/A';

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // =========================================
  // STATUS CLASS
  // =========================================

  getStatusClass(status: string): string {

    switch ((status || '').toLowerCase()) {

      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      case 'rejected': return 'status-cancelled';
      case 'noshow': return 'status-cancelled';

      default: return 'status-default';
    }
  }

  private needsPatientNameLookup(appointment: any): boolean {
    const name = this.getDisplayPatientName(appointment.patientName);
    return Boolean(appointment?.patientId || appointment?.id) && (!name || name === 'Patient' || this.isIdentifierLike(name));
  }

  private shouldLoadPatientDetails(appointment: any): boolean {
    return Boolean(appointment?.patientId || this.needsPatientNameLookup(appointment));
  }

  private getPatientForAppointment(appointment: any) {
    const identityUserId = this.getDisplayPatientName(appointment?.patientId);

    if (identityUserId) {
      return this.patientService.getDetailsByIdentityUserId(identityUserId).pipe(
        catchError(() => this.appointmentService.getAppointmentPatient(appointment.id))
      );
    }

    return this.appointmentService.getAppointmentPatient(appointment.id);
  }

  private extractPatientName(patient: any): string {
    const source = patient?.data ?? patient?.Data ?? patient;

    if (typeof source === 'string') {
      return this.getDisplayPatientName(source);
    }

    const user = source?.user ?? source?.User ?? source?.applicationUser ?? source?.ApplicationUser ?? {};
    const fullName = [
      source?.firstName ?? source?.FirstName,
      source?.lastName ?? source?.LastName
    ]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' ');

    return this.getDisplayPatientName(
      source?.displayName ??
      source?.DisplayName ??
      source?.fullName ??
      source?.FullName ??
      source?.name ??
      source?.Name ??
      source?.patientName ??
      source?.PatientName ??
      user?.displayName ??
      user?.DisplayName ??
      user?.fullName ??
      user?.FullName ??
      user?.name ??
      user?.Name ??
      fullName
    );
  }

  private extractPatientDetails(patient: any): any {
    const source = patient?.data ?? patient?.Data ?? patient;

    if (!source || typeof source !== 'object') {
      return null;
    }

    return source;
  }

  getPatientDetail(appointment: any, key: string): string {
    const details = appointment?.patientDetails ?? {};
    const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
    return this.getDisplayPatientName(details[key] ?? details[pascalKey]);
  }

  getPatientDateOfBirth(appointment: any): string {
    const value = this.getPatientDetail(appointment, 'dateOfBirth');
    return value ? this.formatDate(value) : '';
  }

  getPatientAllergies(appointment: any): string {
    const details = appointment?.patientDetails ?? {};
    const allergies = details.allergies ?? details.Allergies;

    if (typeof allergies === 'string') {
      return allergies.trim();
    }

    if (Array.isArray(allergies)) {
      return allergies
        .map((item) => item?.name ?? item?.Name)
        .filter(Boolean)
        .join(', ');
    }

    return '';
  }

  getPatientMedicalRecords(appointment: any): string {
    const details = appointment?.patientDetails ?? {};
    const records = details.medicalRecords ?? details.MedicalRecords;

    if (!Array.isArray(records)) {
      return '';
    }

    return records
      .map((item) => [item?.diagnosis ?? item?.Diagnosis, item?.notes ?? item?.Notes].filter(Boolean).join(': '))
      .filter(Boolean)
      .join(' | ');
  }

  hasPatientDetails(appointment: any): boolean {
    return Boolean(
      this.getPatientDetail(appointment, 'address') ||
      this.getPatientDateOfBirth(appointment) ||
      this.getPatientDetail(appointment, 'gender') ||
      this.getPatientAllergies(appointment) ||
      this.getPatientMedicalRecords(appointment)
    );
  }

  private getDisplayPatientName(value: unknown): string {
    const name = String(value || '').trim();

    if (!name || /^unknown patient$/i.test(name)) {
      return '';
    }

    return name;
  }

  private isIdentifierLike(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value) || /^\d+$/.test(value);
  }
}
