import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable, timeout, throwError } from 'rxjs';

import { tap, catchError, retry, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

import { DoctorResponse } from '../../shared/models/doctor-response.interface';

import { TimeSlot } from '../../shared/models/timeslot.interface';

import { ClinicResponse } from '../../shared/models/clinic-response.interface';



@Injectable({ providedIn: 'root' })

export class ClinicService {

  private readonly apiUrl = environment.apiUrl;



  constructor(private http: HttpClient) {}

  private getToken(): string {
    if (typeof localStorage === 'undefined') {
      return '';
    }

    return (localStorage.getItem('token') || '')
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/^Bearer\s+/i, '')
      .trim();
  }

  private authHeaders(): Record<string, string> {
    const token = this.getToken();

    return token
      ? { Authorization: `Bearer ${token}` }
      : {};
  }



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

      retry(2),

      timeout(30000),

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
    return this.http.get<{pageIndex: number, pageSize: number, count: number, data: ClinicResponse[]}>(`${environment.apiUrl}/api/doctorclinics/GetAllClinics`, { params }).pipe(
      timeout(12000),
      map((response: {pageIndex: number, pageSize: number, count: number, data: ClinicResponse[]}) => {
        console.log('Raw API response:', response);
        const clinicsArray = response.data || [];
        console.log('Extracted clinics array:', clinicsArray);
        return clinicsArray;
      }),
      catchError(error => {
        console.error('Error in getAllClinics:', error);
        return throwError(() => error);
      })
    );
  }



  getClinicsById(id: number): Observable<ClinicResponse> {

    return this.http.get<ClinicResponse>(`${this.apiUrl}/api/doctorclinics/GetClinicsById/${id}`).pipe(
      map((clinic) => this.normalizeClinic(clinic))
    );

  }



  getAllDoctors(pageIndex = 0, pageSize = 10, search = ''): Observable<DoctorResponse[]> {

    console.log('Calling GetAllDoctors with API:', `${this.apiUrl}/api/doctors/GetAllDoctors`);

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
    return this.http.get<TimeSlot[] | { data?: TimeSlot[] }>(`${environment.timeSlotsApiUrl}/api/timeslots/getavailabletimeslots/${clinicId}`).pipe(
      map((response) => {
        const slots = Array.isArray(response) ? response : response.data ?? [];
        return slots.map((slot) => this.normalizeTimeSlot(slot));
      })
    );
  }

  private normalizeTimeSlot(slot: any): TimeSlot {
    const capacity = Number(slot.capacity ?? slot.Capacity ?? 0);
    const bookedCount = Number(slot.bookedCount ?? slot.BookedCount ?? 0);
    const availableCount = Number(
      slot.availableCount ??
      slot.AvailableCount ??
      slot.remainingCount ??
      slot.RemainingCount ??
      Math.max(capacity - bookedCount, 0)
    );

    return {
      id: Number(slot.id ?? slot.Id ?? 0),
      clinicId: Number(slot.clinicId ?? slot.ClinicId ?? 0),
      clinicName: String(slot.clinicName ?? slot.ClinicName ?? ''),
      date: String(slot.date ?? slot.Date ?? ''),
      startTime: String(slot.startTime ?? slot.StartTime ?? ''),
      endTime: String(slot.endTime ?? slot.EndTime ?? ''),
      capacity,
      bookedCount,
      availableCount,
      price: Number(slot.price ?? slot.Price ?? slot.priceAtBooking ?? slot.PriceAtBooking ?? 0)
    };
  }



  getClinicsByDoctorId(doctorId: string): Observable<ClinicResponse[]> {

    return this.http.get<ClinicResponse[] | { data?: ClinicResponse[]; Data?: ClinicResponse[] }>(
      `${this.apiUrl}/api/doctorclinics/GetClinicsByDoctorId/${doctorId}`
    ).pipe(
      map((response) => this.normalizeClinicsResponse(response))
    );

  }



  getMyClinics(): Observable<ClinicResponse[]> {

    return this.http.get<ClinicResponse[] | { data?: ClinicResponse[]; Data?: ClinicResponse[] }>(
      `${this.apiUrl}/api/doctorclinics/MyClinics`
    ).pipe(
      map((response) => this.normalizeClinicsResponse(response))
    );

  }



  createClinic(data: any): Observable<ClinicResponse> {

    return this.http.post<ClinicResponse>(`${this.apiUrl}/api/doctorclinics/CreateClinics`, data).pipe(
      map((clinic) => this.normalizeClinic(clinic))
    );

  }



  updateClinic(id: number, data: any): Observable<ClinicResponse> {

    return this.http.put<ClinicResponse>(`${this.apiUrl}/api/doctorclinics/UpdateClinics/${id}`, data).pipe(
      map((clinic) => this.normalizeClinic(clinic))
    );

  }

  private normalizeClinicsResponse(response: ClinicResponse[] | { data?: ClinicResponse[]; Data?: ClinicResponse[] }): ClinicResponse[] {
    const clinics = Array.isArray(response) ? response : response.data ?? response.Data ?? [];
    return clinics.map((clinic) => this.normalizeClinic(clinic));
  }

  private normalizeClinic(clinic: any): ClinicResponse {
    return {
      id: Number(clinic.id ?? clinic.Id ?? clinic.clinicId ?? clinic.ClinicId ?? 0),
      doctorId: String(clinic.doctorId ?? clinic.DoctorId ?? clinic.identityUserId ?? clinic.IdentityUserId ?? ''),
      doctorName: String(clinic.doctorName ?? clinic.DoctorName ?? ''),
      clinicName: String(clinic.clinicName ?? clinic.ClinicName ?? ''),
      clinicAddress: String(clinic.clinicAddress ?? clinic.ClinicAddress ?? ''),
      phoneNumber: clinic.phoneNumber ?? clinic.PhoneNumber ?? '',
      description: String(clinic.description ?? clinic.Description ?? '')
    };
  }



  deleteClinic(id: number): Observable<any> {

    return this.http.delete(`${this.apiUrl}/api/doctorclinics/DeleteClinics/${id}`);

  }



  createTimeSlot(data: any): Observable<any> {
    const url = `${environment.timeSlotsApiUrl}/api/timeslots/createtimeslots`;
    console.log('ClinicService: Creating time slot with URL:', url);
    console.log('ClinicService: Request data:', JSON.stringify(data, null, 2));
    return this.http.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders()
      }
    });

  }



  updateTimeSlot(id: number, data: any): Observable<any> {
    return this.http.put(`${environment.timeSlotsApiUrl}/api/timeslots/updatetimeslots/${id}`, data, {
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders()
      }
    });
  }



  deleteTimeSlot(id: number): Observable<any> {
    return this.http.delete(`${environment.timeSlotsApiUrl}/api/timeslots/deletetimeslots/${id}`, {
      headers: this.authHeaders()
    });
  }



  getTimeSlotsByClinic(clinicId: number): Observable<TimeSlot[]> {
    return this.http.get<TimeSlot[]>(`${environment.timeSlotsApiUrl}/api/timeslots/GetTimeSlotsByClinic/${clinicId}`, {
      headers: this.authHeaders()
    });
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

  isDoctorActive(identityUserId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/api/doctors/internal/is-active/${identityUserId}`);
  }

}

