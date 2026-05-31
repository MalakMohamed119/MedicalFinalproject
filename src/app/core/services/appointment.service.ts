import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

    return localStorage.getItem('token') || '';
  }

  private authHeaders() {
    return {
      Authorization: `Bearer ${this.getToken()}`
    };
  }

  private emptyListOnNotFound(error: any): Observable<AppointmentResponse[]> {
    if (error.status === 404) {
      return of([]);
    }

    return throwError(() => error);
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

  updateAppointmentStatus(appointmentId: number, status: string): Observable<any> {
    return this.http.put(`${this.appointmentsUrl}/updatestatus`, { appointmentId, status }, {
      headers: this.authHeaders()
    });
  }

  getClinicAppointments(clinicId: number): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/ShowClinicAppointments?clinicId=${clinicId}`, {
      headers: this.authHeaders()
    }).pipe(
      catchError(error => this.emptyListOnNotFound(error))
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
    return this.http.get(`${this.appointmentsUrl}/${appointmentId}/patient`);
  }

  getClinicConfirmedAppointments(clinicId: number): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/clinic/${clinicId}/confirmed`).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getClinicPendingAppointments(clinicId: number): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/clinic/${clinicId}/pending`).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getClinicCancelledAppointments(clinicId: number): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/clinic/${clinicId}/cancelled`).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getPatientConfirmedAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/patient/confirmed`).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getPatientPendingAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/patient/pending`).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }

  getPatientCancelledAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.appointmentsUrl}/patient/cancelled`).pipe(
      catchError(error => this.emptyListOnNotFound(error))
    );
  }
}
