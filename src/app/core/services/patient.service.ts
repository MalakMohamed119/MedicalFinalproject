import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
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
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  getMyProfile(): Observable<PatientProfileResponse> {
    return this.http.get<PatientProfileResponse>(`${this.patientUrl}/MyProfile`);
  }

  getMyDetails(): Observable<PatientProfileResponse> {
    return this.http.get<PatientProfileResponse>(`${this.patientUrl}/MyDetails`);
  }

  hasPatientProfile(): Observable<boolean> {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return of(false);
    }

    return this.getDetailsByIdentityUserId(userId).pipe(
      map(() => true),
      catchError((error) => of(error.status !== 404))
    );
  }

  createPatient(data: Partial<PatientProfileResponse> | PatientCreateRequest): Observable<PatientProfileResponse> {
    return this.http.post<PatientProfileResponse>(`${this.patientUrl}/Create`, data);
  }




  updatePatient(data: PatientUpdateRequest): Observable<void> {
    return this.http.put<void>(`${this.patientUrl}/Update`, data);
  }

  deletePatient(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.patientUrl}/Delete/${id}`);
  }

  getAllPatients(): Observable<PatientProfileResponse[]> {
    return this.http.get<PatientProfileResponse[] | {
      data?: PatientProfileResponse[];
      Data?: PatientProfileResponse[];
      items?: PatientProfileResponse[];
      Items?: PatientProfileResponse[];
      $values?: PatientProfileResponse[];
    }>(`${this.patientUrl}/All`).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response;
        }

        return response.data ??
          response.Data ??
          response.items ??
          response.Items ??
          response.$values ??
          [];
      })
    );
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
