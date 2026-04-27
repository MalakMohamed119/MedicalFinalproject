import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, throwError } from 'rxjs';
import { tap, catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DoctorResponse } from '../../shared/models/doctor-response.interface';
import { TimeSlot } from '../../shared/models/timeslot.interface';
import { ClinicResponse } from '../../shared/models/clinic-response.interface';

@Injectable({ providedIn: 'root' })
export class ClinicService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAdminDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/api/Dashboard/admin/Dashboard`).pipe(
      tap((response) => console.log('Admin dashboard response:', response)),
      catchError((error) => {
        console.error('Admin dashboard error:', error);
        return throwError(() => error);
      })
    );
  }

  getDoctorDashboard(): Observable<any> {
    console.log('Calling getDoctorDashboard with URL:', `${this.apiUrl}/api/api/Dashboard/Doctor/Dashboard`);
    return this.http.get(`${this.apiUrl}/api/api/Dashboard/Doctor/Dashboard`).pipe(
      retry(2), // Retry up to 2 times on failure
      timeout(30000), // Increased to 30 seconds
      tap((response) => {
        console.log('✅ Doctor dashboard response received:', response);
      }),
      catchError((error) => {
        console.error('❌ Doctor dashboard error:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        return throwError(() => error);
      })
    );
  }

  getDoctorClinicDashboard(clinicId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/api/Dashboard/DoctorClinic/Dashboard/${clinicId}`).pipe(
      tap((response) => console.log('Doctor clinic dashboard response:', response)),
      catchError((error) => {
        console.error('Doctor clinic dashboard error:', error);
        return throwError(() => error);
      })
    );
  }

  getAllClinics(params: any): Observable<ClinicResponse[]> {
    return this.http.get<ClinicResponse[]>(`${this.apiUrl}/api/doctorclinics/GetAllClinics`, { params });
  }

  getClinicsById(id: number): Observable<ClinicResponse> {
    return this.http.get<ClinicResponse>(`${this.apiUrl}/api/doctorclinics/GetClinicsById/${id}`);
  }

  getAllDoctors(pageIndex = 0, pageSize = 10, search = ''): Observable<DoctorResponse[]> {
    console.log('Calling GetAllDoctors with API:', `${this.apiUrl}/api/api/doctors/GetAllDoctors`);
    const params = { pageIndex: pageIndex.toString(), pageSize: pageSize.toString(), search };
    return this.http.get<DoctorResponse[]>(`${this.apiUrl}/api/doctors/GetAllDoctors`, { params });
  }

  activateDoctor(id: string | number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/api/doctors/activate/${id}`, {});
  }

  deactivateDoctor(id: string | number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/api/doctors/deactivate/${id}`, {});
  }

  deleteUser(email: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/auth/Clinic/Authentication/DeleteUser?email=${encodeURIComponent(email)}`
    );
  }

  getDoctorDetails(id: string): Observable<DoctorResponse> {
    return this.http.get<DoctorResponse>(`${this.apiUrl}/api/doctors/GetAllDoctorDetatils/${id}`);
  }

  getAvailableSlots(clinicId: number): Observable<TimeSlot[]> {
    return this.http.get<TimeSlot[]>(`${this.apiUrl}/api/timeslots/getavailabletimeslots/${clinicId}`);
  }

  getClinicsByDoctorId(doctorId: string): Observable<ClinicResponse[]> {
    return this.http.get<ClinicResponse[]>(`${this.apiUrl}/api/doctorclinics/GetClinicsByDoctorId/${doctorId}`);
  }

  getMyClinics(): Observable<ClinicResponse[]> {
    return this.http.get<ClinicResponse[]>(`${this.apiUrl}/api/doctorclinics/MyClinics`);
  }

  createClinic(data: any): Observable<ClinicResponse> {
    return this.http.post<ClinicResponse>(`${this.apiUrl}/api/doctorclinics/CreateClinics`, data);
  }

  updateClinic(id: number, data: any): Observable<ClinicResponse> {
    return this.http.put<ClinicResponse>(`${this.apiUrl}/api/doctorclinics/UpdateClinics/${id}`, data);
  }

  deleteClinic(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/doctorclinics/DeleteClinics/${id}`);
  }

  createTimeSlot(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/timeslots/createtimeslots`, data);
  }

  updateTimeSlot(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/timeslots/updatetimeslots/${id}`, data);
  }

  deleteTimeSlot(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/timeslots/deletetimeslots/${id}`);
  }

  getTimeSlotsByClinic(clinicId: number): Observable<TimeSlot[]> {
    return this.http.get<TimeSlot[]>(`${this.apiUrl}/api/timeslots/GetTimeSlotsByClinic/${clinicId}`);
  }

  createDoctor(doctorData: any): Observable<any> {
    const payload = {
      displayName: doctorData.displayName,
      email: doctorData.email,
      phoneNumber: doctorData.phoneNumber,
      specialty: doctorData.specialty,
      password: doctorData.password
    };
    return this.http.post(`${this.apiUrl}/api/doctors/CreateDoctor`, payload).pipe(
      tap((response: any) => {
        console.log('Doctor creation response:', response);
        if (response && typeof response === 'object' && 'success' in response && !response.success) {
          throw new Error(response.message || 'Failed to create doctor');
        }
        console.log('Doctor created successfully');
      }),
      catchError(error => {
        console.error('Doctor creation error:', error);
        return throwError(() => error);
      })
    );
  }

  updateDoctor(id: string, data: any): Observable<DoctorResponse> {
    return this.http.put<DoctorResponse>(`${this.apiUrl}/api/doctors/UpdateDoctor/${id}`, data).pipe(
      catchError(error => {
        console.error('Update doctor error:', error);
        return throwError(() => error);
      })
    );
  }

  updateDoctorPassword(id: string, newPassword: string): Observable<boolean> {
    return this.http.put<boolean>(`${this.apiUrl}/api/doctors/UpdateDoctorPassword/${id}`, { newPassword }).pipe(
      catchError(error => {
        console.error('Update doctor password error:', error);
        return throwError(() => error);
      })
    );
  }
}
