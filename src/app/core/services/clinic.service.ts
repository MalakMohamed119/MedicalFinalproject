import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

import { DoctorResponse } from '../../shared/models/doctor-response.interface';
import { TimeSlot } from '../../shared/models/timeslot.interface';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClinicResponse } from '../../shared/models/clinic-response.interface';

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private readonly apiUrl = environment.apiUrl;


  constructor(private http: HttpClient) {}

  getAdminDashboard(): Observable<any> {
const url = `${this.apiUrl}/api/Dashboard/admin/Dashboard`;
    console.log('AdminDashboard URL:', url);
    return this.http.get(url);
  }


  getAllClinics(params: any): Observable<ClinicResponse[]> {
    return this.http.get<ClinicResponse[]>(`${this.apiUrl}/doctorclinics/GetAllClinics`, { params });
  }


  getClinicsById(id: number): Observable<ClinicResponse> {
    return this.http.get<ClinicResponse>(`${this.apiUrl}/doctorclinics/GetClinicsById/${id}`);
  }

  getAllDoctors(page?: number, size: number = 10): Observable<DoctorResponse[]> {
    const params = { page: (page || 0).toString(), size: size.toString() };
    return this.http.get<DoctorResponse[]>(`${this.apiUrl}/doctors/GetAllDoctors`, { params });
  }

  activateDoctor(id: string | number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/doctors/activate/${id}`, {});
  }

  deactivateDoctor(id: string | number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/doctors/deactivate/${id}`, {});
  }

  deleteUser(email: string): Observable<void> {
    const url = `${this.apiUrl}/Clinic/Authentication/DeleteUser?email=${encodeURIComponent(email)}`;
    return this.http.delete<void>(url);
  }

  getDoctorDetails(id: string): Observable<DoctorResponse> {
    return this.http.get<DoctorResponse>(`${this.apiUrl}/doctors/GetAllDoctorDetatils/${id}`);
  }

  getAvailableSlots(clinicId: number): Observable<TimeSlot[]> {
    return this.http.get<TimeSlot[]>(`${this.apiUrl}/timeslots/getavailabletimeslots/${clinicId}`);
  }

  getClinicsByDoctorId(doctorId: string): Observable<ClinicResponse[]> {
    return this.http.get<ClinicResponse[]>(`${this.apiUrl}/doctorclinics/GetClinicsByDoctorId/${doctorId}`);
  }

  createClinic(data: any): Observable<ClinicResponse> {
    return this.http.post<ClinicResponse>(`${this.apiUrl}/CreateClinics`, data);
  }

  updateClinic(id: number, data: any): Observable<ClinicResponse> {
    return this.http.put<ClinicResponse>(`${this.apiUrl}/UpdateClinics/${id}`, data);
  }

  deleteClinic(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/DeleteClinics/${id}`);
  }
}
