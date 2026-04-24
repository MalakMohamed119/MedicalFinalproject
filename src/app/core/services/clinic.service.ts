import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DoctorResponse } from '../../shared/models/doctor-response.interface';
import { TimeSlot } from '../../shared/models/timeslot.interface';
import { ClinicResponse } from '../../shared/models/clinic-response.interface';

@Injectable({ providedIn: 'root' })
export class ClinicService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAdminDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/api/Dashboard/admin/Dashboard`);
  }

  getDoctorDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/api/Dashboard/Doctor/Dashboard`);
  }

  getDoctorClinicDashboard(clinicId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/api/Dashboard/DoctorClinic/Dashboard/${clinicId}`);
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
}
