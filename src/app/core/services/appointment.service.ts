import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AppointmentResponse } from '../../shared/models/appointment-response.interface';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  // Book appointment
  bookAppointment(timeSlotId: number): Observable<AppointmentResponse> {
    console.log('🔄 Booking appointment with timeSlotId:', timeSlotId);
    
    return this.http.post<AppointmentResponse>(`${environment.apiUrl}/appointments/book`, { timeSlotId }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      }
    }).pipe(
      catchError(error => {
        console.error('❌ Appointment booking error:', error);
        
        // Extract error message from various possible response formats
        let errorMessage = 'Booking failed';
        
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.detail) {
            errorMessage = error.error.detail;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          }
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.status) {
          errorMessage = `Booking failed: HTTP ${error.status}`;
        }
        
        console.log('📊 Extracted error message:', errorMessage);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // Cancel appointment (Patient only)
  cancelAppointment(appointmentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/appointments/${appointmentId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      }
    });
  }

  // Update appointment status (Doctor only)
  updateAppointmentStatus(appointmentId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/appointments/updatestatus`, { appointmentId, status }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      }
    });
  }

  // Get clinic appointments (Doctor only)
  getClinicAppointments(clinicId: number): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.apiUrl}/appointments/ShowClinicAppointments?clinicId=${clinicId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      }
    });
  }

  // Get patient appointments (Patient only, token-based)
  getPatientAppointments(): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.apiUrl}/appointments/ShowPatientAppointments`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      }
    });
  }
}

