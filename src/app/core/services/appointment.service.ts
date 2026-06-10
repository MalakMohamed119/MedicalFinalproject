import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AppointmentResponse } from '../../shared/models/appointment-response.interface';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly appointmentsUrl = `${environment.timeSlotsApiUrl}/api/appointments`;

  constructor(private http: HttpClient) {}

  private getToken(): string {
    if (typeof localStorage === 'undefined') {
      return '';
    }

    return (localStorage.getItem('token') || '')
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/^Bearer\s+/i, '')
      .trim();
  }

  private authHeaders(): Record<string, string> {
    const token = this.getToken();

    return token
      ? { Authorization: `Bearer ${token}` }
      : {};
  }

  private emptyListOnNotFound(error: any): Observable<AppointmentResponse[]> {
    if (error.status === 404) {
      const detail = String(error.error?.detail || error.error?.title || '').toLowerCase();
      if (
        !detail ||
        detail.includes('appointment') ||
        detail.includes('not found') ||
        detail.includes('no appointments')
      ) {
        return of([]);
      }
    }

    return throwError(() => error);
  }

  private normalizeAppointment(raw: any): AppointmentResponse {
    const timeSlot = raw.timeSlot ?? raw.TimeSlot ?? raw.slot ?? raw.Slot ?? {};
    const patient = raw.patient ?? raw.Patient ?? {};
    const startTime = raw.startTime ?? raw.StartTime ?? timeSlot.startTime ?? timeSlot.StartTime ?? '';
    const endTime = raw.endTime ?? raw.EndTime ?? timeSlot.endTime ?? timeSlot.EndTime ?? '';
    const date =
      raw.date ??
      raw.Date ??
      raw.appointmentDate ??
      raw.AppointmentDate ??
      timeSlot.date ??
      timeSlot.Date ??
      (String(startTime).includes('T') ? startTime : '');

    return {
      id: Number(raw.id ?? raw.Id ?? raw.appointmentId ?? raw.AppointmentId ?? 0),
      clinicId: Number(raw.clinicId ?? raw.ClinicId ?? 0),
      clinicName: raw.clinicName ?? raw.ClinicName,
      timeSlotId: Number(raw.timeSlotId ?? raw.TimeSlotId ?? timeSlot.id ?? timeSlot.Id ?? 0),
      patientId: String(raw.patientId ?? raw.PatientId ?? patient.id ?? patient.Id ?? ''),
      patientName:
        raw.patientName ??
        raw.PatientName ??
        patient.displayName ??
        patient.DisplayName ??
        patient.fullName ??
        patient.FullName ??
        patient.name ??
        patient.Name,
      doctorName: raw.doctorName ?? raw.DoctorName,
      status: raw.status ?? raw.Status ?? 'Unknown',
      appointmentDate: raw.appointmentDate ?? raw.AppointmentDate ?? date,
      date: String(date ?? ''),
      startTime: String(startTime ?? ''),
      endTime: String(endTime ?? ''),
      priceAtBooking: Number(raw.priceAtBooking ?? raw.PriceAtBooking ?? raw.price ?? raw.Price ?? 0),
      price: Number(raw.price ?? raw.Price ?? raw.priceAtBooking ?? raw.PriceAtBooking ?? 0)
    };
  }

  private normalizeAppointmentList(response: any): AppointmentResponse[] {
    const list = this.extractArray(response);

    return list.map((item) => this.normalizeAppointment(item));
  }

  private extractArray(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (!value || typeof value !== 'object') {
      return [];
    }

    const candidates = [
      value.data,
      value.Data,
      value.items,
      value.Items,
      value.appointments,
      value.Appointments,
      value.result,
      value.Result,
      value.$values
    ];

    for (const candidate of candidates) {
      const list = this.extractArray(candidate);
      if (list.length > 0) {
        return list;
      }
    }

    return [];
  }

  bookAppointment(timeSlotId: number): Observable<AppointmentResponse> {
    const payload = { timeSlotId };

    return this.http.post<AppointmentResponse>(`${this.appointmentsUrl}/book`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders()
      }
    }).pipe(
      catchError(error => {
        let errorMessage = 'Booking failed';

        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.errors && typeof error.error.errors === 'object') {
            const validationErrors = Object.values(error.error.errors).flat();
            errorMessage = validationErrors.join(', ') || 'Validation errors occurred';
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.detail) {
            errorMessage = error.error.detail;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error.title) {
            errorMessage = error.error.title;
          }
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.status) {
          errorMessage = `Booking failed: HTTP ${error.status}`;
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  cancelAppointment(appointmentId: number): Observable<any> {
    return this.http.delete(`${this.appointmentsUrl}/${appointmentId}`, {
      headers: this.authHeaders()
    });
  }

  updateAppointmentStatus(appointmentId: number, status: number | string): Observable<any> {
    return this.http.put(`${this.appointmentsUrl}/updatestatus`, {
      appointmentId,
      status: this.toStatusValue(status)
    }, {
      headers: this.authHeaders()
    });
  }

  private toStatusValue(status: number | string): number {
    if (typeof status === 'number') {
      return status;
    }

    switch (status.toLowerCase()) {
      case 'pending':
        return 0;
      case 'confirmed':
        return 1;
      case 'cancelled':
      case 'canceled':
      case 'rejected':
        return 2;
      case 'completed':
        return 3;
      case 'noshow':
      case 'no show':
      case 'no-show':
        return 4;
      default:
        return Number(status) || 0;
    }
  }

  getClinicAppointments(clinicId: number): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[] | Record<string, unknown>>(`${this.appointmentsUrl}/ShowClinicAppointments?clinicId=${clinicId}`, {
      headers: this.authHeaders()
    }).pipe(
      map((response) => this.normalizeAppointmentList(response)),
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getAllAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[] | Record<string, unknown>>(`${this.appointmentsUrl}/all`, {
      headers: this.authHeaders()
    }).pipe(
      map((response) => this.normalizeAppointmentList(response))
    );
  }

  getPatientAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/ShowPatientAppointments`, {
      headers: this.authHeaders()
    }).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getAllPatientAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/ShowPatientAppointments`, {
      headers: this.authHeaders()
    }).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getAppointmentPatient(appointmentId: number): Observable<any> {
    return this.http.get(`${this.appointmentsUrl}/${appointmentId}/patient`, {
      headers: this.authHeaders()
    });
  }

  getClinicConfirmedAppointments(clinicId: number): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/clinic/${clinicId}/confirmed`, {
      headers: this.authHeaders()
    }).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getClinicPendingAppointments(clinicId: number): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/clinic/${clinicId}/pending`, {
      headers: this.authHeaders()
    }).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getClinicCancelledAppointments(clinicId: number): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/clinic/${clinicId}/cancelled`, {
      headers: this.authHeaders()
    }).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getPatientConfirmedAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/patient/confirmed`, {
      headers: this.authHeaders()
    }).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getPatientPendingAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/patient/pending`, {
      headers: this.authHeaders()
    }).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getPatientCancelledAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/patient/cancelled`, {
      headers: this.authHeaders()
    }).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

}
