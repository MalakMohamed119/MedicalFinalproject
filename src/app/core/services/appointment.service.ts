import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.post<AppointmentResponse>(`${this.apiUrl}/appointments/book`, { timeSlotId }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      }
    });
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

