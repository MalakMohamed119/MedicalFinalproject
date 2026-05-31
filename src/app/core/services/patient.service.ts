import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PatientCreateRequest,
  PatientMedicalData,
  PatientProfileResponse,
  PatientUpdateRequest
} from '../../shared/models/patient.interface';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly patientUrl = `${environment.apiUrl}/patient/Patiant`;


  constructor(private http: HttpClient) {}

  getMyProfile(): Observable<PatientProfileResponse> {
    return this.http.get<PatientProfileResponse>(`${this.patientUrl}/MyProfile`);
  }

  getMyDetails(): Observable<PatientProfileResponse> {
    return this.http.get<PatientProfileResponse>(`${this.patientUrl}/MyDetails`);
  }

  createPatient(data: Partial<PatientProfileResponse> | PatientCreateRequest): Observable<PatientProfileResponse> {
    return this.http.post<PatientProfileResponse>(`${this.patientUrl}/Create`, data);
  }




  updatePatient(
    id: string | number,
    data: Partial<PatientProfileResponse> | PatientUpdateRequest
  ): Observable<PatientProfileResponse> {
    return this.http.put<PatientProfileResponse>(`${this.patientUrl}/Update/${id}`, data);
  }

  deletePatient(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.patientUrl}/Delete/${id}`);
  }

  getAllPatients(): Observable<PatientProfileResponse[]> {
    return this.http.get<PatientProfileResponse[]>(`${this.patientUrl}/All`);
  }

  saveMyMedicalData(data: PatientMedicalData): Observable<PatientProfileResponse> {
    return this.http.post<PatientProfileResponse>(`${this.patientUrl}/MyMedicalData`, data);
  }

  getDetailsByIdentityUserId(identityUserId: string): Observable<PatientProfileResponse> {
    return this.http.get<PatientProfileResponse>(
      `${this.patientUrl}/DetailsByIdentityUserId/${identityUserId}`
    );
  }
}
