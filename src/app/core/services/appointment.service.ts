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

    const payload = { timeSlotId };

    console.log('🔄 Booking appointment with timeSlotId:', timeSlotId);

    console.log('📦 Payload being sent:', JSON.stringify(payload, null, 2));

    console.log('🌐 API URL:', `${environment.timeSlotsApiUrl}/appointments/book`);

    

    return this.http.post<AppointmentResponse>(`${environment.timeSlotsApiUrl}/appointments/book`, payload, {

      headers: {

        'Content-Type': 'application/json',

        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`

      }

    }).pipe(

      catchError(error => {

        console.error('❌ Appointment booking error:', error);

        console.error('📊 Error status:', error.status);

        console.error('📊 Error response body:', JSON.stringify(error.error, null, 2));

        

        // Extract error message from various possible response formats

        let errorMessage = 'Booking failed';

        

        if (error.error) {

          if (typeof error.error === 'string') {

            errorMessage = error.error;

          } else if (error.error.errors && typeof error.error.errors === 'object') {

            // Handle validation errors object

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

        

        console.log('📊 Extracted error message:', errorMessage);

        return throwError(() => new Error(errorMessage));

      })

    );

  }



  // Cancel appointment (Patient only)

  cancelAppointment(appointmentId: number): Observable<any> {

    return this.http.delete(`${environment.timeSlotsApiUrl}/appointments/${appointmentId}`, {

      headers: {

        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`

      }

    });

  }



  // Update appointment status (Doctor only)

  updateAppointmentStatus(appointmentId: number, status: string): Observable<any> {

    return this.http.put(`${environment.timeSlotsApiUrl}/appointments/updatestatus`, { appointmentId, status }, {

      headers: {

        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`

      }

    });

  }



  // Get clinic appointments (Doctor only)

  getClinicAppointments(clinicId: number): Observable<AppointmentResponse[]> {

    return this.http.get<AppointmentResponse[]>(`${environment.timeSlotsApiUrl}/appointments/ShowClinicAppointments?clinicId=${clinicId}`, {

      headers: {

        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`

      }

    });

  }



  // Get patient appointments (Patient only, token-based)
  getPatientAppointments(): Observable<AppointmentResponse[]> {
    const url = `${environment.timeSlotsApiUrl}/appointments/ShowPatientAppointments`;
    const token = localStorage.getItem('token') || '';
    
    console.log('🔄 Calling patient appointments API:', url);
    console.log('🔑 Token present:', !!token);
    console.log('🔑 Token preview:', token.substring(0, 20) + '...');

    return this.http.get<AppointmentResponse[]>(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Get all patient appointments (Doctor view)
  getAllPatientAppointments(): Observable<AppointmentResponse[]> {
    const url = `${environment.timeSlotsApiUrl}/appointments/ShowPatientAppointments`;
    const token = localStorage.getItem('token') || '';
    
    console.log('🔄 Calling all patient appointments API:', url);
    console.log('🔑 Token present:', !!token);

    return this.http.get<AppointmentResponse[]>(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

}



