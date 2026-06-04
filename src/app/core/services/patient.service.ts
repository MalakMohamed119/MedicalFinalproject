import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
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

  hasPatientProfile(): Observable<boolean> {
    return this.getMyProfile().pipe(
      map(() => true),
      catchError((profileError) => {
        if (profileError.status !== 404) {
          return of(true);
        }

        return this.getMyDetails().pipe(
          map(() => true),
          catchError((detailsError) => of(detailsError.status !== 404))
        );
      })
    );
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
