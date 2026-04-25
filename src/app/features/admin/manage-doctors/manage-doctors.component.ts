import { Component, signal, computed, inject, effect, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminFooterComponent } from '../../../shared/components/admin-footer/admin-footer.component';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { DoctorResponse } from '../../../shared/models/doctor-response.interface';

interface PaginatedResult<T> {
  items?: T[];
  data?: T[];
  totalCount?: number;
  pageIndex?: number;
  pageSize?: number;
}

type DoctorsData = DoctorResponse[] | PaginatedResult<DoctorResponse>;

@Component({
  selector: 'app-manage-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, AdminFooterComponent],
  templateUrl: './manage-doctors.component.html',
  styleUrl: './manage-doctors.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageDoctorsComponent implements OnInit {
  private authService = inject(AuthService);
  private clinicService = inject(ClinicService);

  readonly pageSize = 10;
  readonly searchControl = new FormControl('');
  readonly pageIndex = signal(0);
  readonly doctors = signal<DoctorsData>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly paginatedDoctors = computed(() => {
    const rawData = this.doctors();
    const allDoctors = this.getDoctorsArray(rawData);
    const start = this.pageIndex() * this.pageSize;
    const end = start + this.pageSize;
    console.log('paginatedDoctors rawData:', rawData, 'allDoctors:', allDoctors);
    return allDoctors.slice(start, end);
  });

  readonly totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize));

  readonly hasPrev = computed(() => this.pageIndex() > 0);
  readonly hasNext = computed(() => (this.pageIndex() + 1) * this.pageSize < this.totalCount());

  private getDoctorsArray(data: DoctorsData): DoctorResponse[] {
    if (Array.isArray(data)) {
      return data;
    }
    return data?.items ?? data?.data ?? [];
  }

  private getDoctorsCount(data: DoctorsData): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    return data?.totalCount ?? this.getDoctorsArray(data).length;
  }

  private updateDoctorsData(data: DoctorsData, updater: (doctors: DoctorResponse[]) => DoctorResponse[]): DoctorsData {
    if (Array.isArray(data)) {
      return updater(data);
    }

    const doctorsArray = this.getDoctorsArray(data);
    const updatedDoctors = updater(doctorsArray);
    const hasItems = Array.isArray(data.items);
    const hasData = Array.isArray(data.data);

    if (hasItems) {
      return {
        ...data,
        items: updatedDoctors,
        totalCount: updatedDoctors.length
      };
    }

    if (hasData) {
      return {
        ...data,
        data: updatedDoctors,
        totalCount: updatedDoctors.length
      };
    }

    return updatedDoctors;
  }

  constructor() {
    effect(() => {
      if (this.authService.getRole() !== 'Admin') {
        // Handle redirect if needed
      }
    });
  }

  ngOnInit(): void {
    this.setupSearch();
    this.loadDoctors();
  }

  private setupSearch(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).pipe(
      switchMap(search => this.clinicService.getAllDoctors(0, 100, search || ''))
    ).subscribe({
      next: (doctors) => {
        console.log('Raw Doctors Data from API:', doctors);
        this.doctors.set(doctors);
        this.totalCount.set(this.getDoctorsCount(doctors));
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Doctors load error:', err);
        this.error.set('Failed to load doctors');
        this.loading.set(false);
      }
    });
  }

  loadDoctors(): void {
    this.loading.set(true);
    this.error.set('');

    this.clinicService.getAllDoctors(0, 100, this.searchControl.value || '').subscribe({
      next: (doctors) => {
        console.log('Raw Doctors Data from API:', doctors);
        this.doctors.set(doctors);
        this.totalCount.set(this.getDoctorsCount(doctors));
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Doctors load error:', err);
        this.error.set('Failed to load doctors');
        this.loading.set(false);
      }
    });
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.pageIndex.set(page);
    }
  }

  prevPage(): void {
    if (this.hasPrev()) {
      this.pageIndex.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.hasNext()) {
      this.pageIndex.update(p => p + 1);
    }
  }

  toggleDoctorStatus(doctor: DoctorResponse): void {
    const id = doctor.id;
    const newStatus = !doctor.isActive;
    
    const request$ = newStatus 
      ? this.clinicService.activateDoctor(id) 
      : this.clinicService.deactivateDoctor(id);

    request$.subscribe({
      next: () => {
        this.doctors.update(docs => this.updateDoctorsData(docs, currentDoctors => 
          currentDoctors.map(d => d.id === id ? { ...d, isActive: newStatus } : d)
        ));
      },
      error: (err: any) => {
        this.error.set('Failed to update doctor status');
        console.error(err);
      }
    });
  }

  deleteDoctor(doctor: DoctorResponse): void {
    if (!confirm(`Delete doctor "${doctor.displayName}" (${doctor.email})? This cannot be undone.`)) {
      return;
    }

    this.clinicService.deleteUser(doctor.email).subscribe({
      next: () => {
        this.doctors.update(docs => this.updateDoctorsData(docs, currentDoctors => 
          currentDoctors.filter(d => d.id !== doctor.id)
        ));
        this.totalCount.update(count => count - 1);
      },
      error: (err: any) => {
        this.error.set('Failed to delete doctor');
        console.error(err);
      }
    });
  }

  trackByDoctorId(_index: number, doctor: DoctorResponse): string {
    return doctor.id;
  }
}
