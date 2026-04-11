import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClinicResponse } from '../../shared/models/clinic-response.interface';

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private readonly apiUrl = 'http://localhost:8082/doctorclinics';

  constructor(private http: HttpClient) {}

  getAllClinics(params: any): Observable<ClinicResponse[]> {
    return this.http.get<ClinicResponse[]>(`${this.apiUrl}/GetAllClinics`, { params });
  }

  getClinicsByDoctorId(doctorId: string): Observable<ClinicResponse[]> {
    return this.http.get<ClinicResponse[]>(`${this.apiUrl}/GetClinicsByDoctorId/${doctorId}`);
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
