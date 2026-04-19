import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tap, catchError, throwError } from 'rxjs';

import { DoctorResponse } from '../../shared/models/doctor-response.interface';
import { TimeSlot } from '../../shared/models/timeslot.interface';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClinicResponse } from '../../shared/models/clinic-response.interface';


@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private readonly apiUrl = environment.apiUrl;


  constructor(private http: HttpClient) {}

  getAdminDashboard(): Observable<any> {
    const url = `${this.apiUrl}/api/api/Dashboard/admin/Dashboard`;
    console.log('AdminDashboard URL:', url);
    return this.http.get(url);
  }



  getAllClinics(params: any): Observable<ClinicResponse[]> {
    return this.http.get<ClinicResponse[]>(`${this.apiUrl}/api/doctorclinics/GetAllClinics`, { params });
  }


  getClinicsById(id: number): Observable<ClinicResponse> {
    return this.http.get<ClinicResponse>(`${this.apiUrl}/api/doctorclinics/GetClinicsById/${id}`);
  }

  getAllDoctors(page?: number, size: number = 10): Observable<DoctorResponse[]> {
    const params = { page: (page || 0).toString(), size: size.toString() };
    return this.http.get<DoctorResponse[]>(`${this.apiUrl}/api/doctors/GetAllDoctors`, { params });
  }

  activateDoctor(id: string | number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/api/doctors/activate/${id}`, {});
  }

  deactivateDoctor(id: string | number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/api/doctors/deactivate/${id}`, {});
  }

  deleteUser(email: string): Observable<void> {
    const url = `${this.apiUrl}/auth/Clinic/Authentication/DeleteUser?email=${encodeURIComponent(email)}`;
    return this.http.delete<void>(url);
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

  createClinic(data: any): Observable<ClinicResponse> {
    return this.http.post<ClinicResponse>(`${this.apiUrl}/api/CreateClinics`, data);
  }

  updateClinic(id: number, data: any): Observable<ClinicResponse> {
    return this.http.put<ClinicResponse>(`${this.apiUrl}/api/UpdateClinics/${id}`, data);
  }

  deleteClinic(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/DeleteClinics/${id}`);
  }

  createDoctor(doctorData: any): Observable<any> {
    const payload = {
      displayName: doctorData.displayName,
      email: doctorData.email,
      phoneNumber: doctorData.phoneNumber,
      specialty: doctorData.specialty,
      password: doctorData.password
    };
    console.log('Create Doctor Payload:', payload);
    return this.http.post(`${this.apiUrl}/api/doctors/CreateDoctor`, payload).pipe(
      tap(() => console.log('Doctor created successfully')),
      catchError(error => {
        console.error('Doctor creation error:', error);
        return throwError(() => error);
      })
    );
  }
}

