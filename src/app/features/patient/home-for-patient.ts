import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { PatientFooterComponent } from '../../shared/components/patient-footer/patient-footer.component';
import { Navbar } from '../../shared/components/navbar/navbar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicResponse } from '../../shared/models/clinic-response.interface';
import { TimeSlot } from '../../shared/models/timeslot.interface';
import { ClinicService } from '../../core/services/clinic.service';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, timeout } from 'rxjs/operators';

type ClinicCard = ClinicResponse & {
  rating: number;
  reviewCount: number;
  availableSlots: number;
  image: string;
  specialty: string;
  distanceKm: number;
  isOpen: boolean;
};

type AvailabilityFilter = 'all' | 'open';
type SortOption = 'recommended' | 'rating' | 'distance';

@Component({
  selector: 'app-home-for-patient',
  standalone: true,
  imports: [CommonModule, FormsModule, PatientFooterComponent, Navbar],
  templateUrl: './home-for-patient.html',
  styleUrl: './home-for-patient.scss'
})
export class HomeForPatient implements OnInit {
  private clinicService = inject(ClinicService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  readonly starNumbers: number[] = [1, 2, 3, 4, 5];
  readonly specialtyFilters = ['All', 'General Practice', 'Specialized Care', 'Family Medicine', 'Diagnostics'];
  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'rating', label: 'Highest rated' },
    { value: 'distance', label: 'Nearest' }
  ];

  clinics: ClinicCard[] = [];
  filteredClinics: ClinicCard[] = [];
  activeSpecialty = 'All';
  availabilityFilter: AvailabilityFilter = 'all';
  locationFilter = '';
  sortBy: SortOption = 'recommended';
  mapView = false;
  toolbarScrolled = false;

  stats = {
    totalClinics: 0,
    totalDoctors: 23,
    happyPatients: 1247
  };
  isLoading = false;
  error: string | null = null;
  showTooltip = false;

  ngOnInit(): void {
    this.loadClinics();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrolled = window.scrollY > 280;
    if (scrolled !== this.toolbarScrolled) {
      this.toolbarScrolled = scrolled;
      this.cdr.markForCheck();
    }
  }

  loadClinics(): void {
    this.isLoading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.clinicService
      .getAllClinics({ pageIndex: 0, pageSize: 24 })
      .pipe(
        timeout(12000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: unknown) => {
          const data = Array.isArray(res)
            ? res
            : ((res as { data?: ClinicResponse[]; results?: ClinicResponse[] })?.data ||
                (res as { results?: ClinicResponse[] })?.results ||
                []);

          this.clinics = (data as ClinicResponse[]).map((clinic) => this.enrichClinic(clinic));
          this.stats.totalClinics = this.clinics.length;
          this.loadSlotCounts();
          this.cdr.markForCheck();
        },
        error: (err: { name?: string }) => {
          this.error =
            err?.name === 'TimeoutError'
              ? 'Clinics are taking too long to load. Please try again.'
              : 'Failed to load clinics';
          this.cdr.markForCheck();
        }
      });
  }

  private enrichClinic(clinic: ClinicResponse): ClinicCard {
    const specialties = ['General Practice', 'Specialized Care', 'Family Medicine', 'Diagnostics'];
    const specialty = clinic.description?.trim()
      ? specialties[clinic.id % specialties.length]
      : 'General Practice';

    return {
      ...clinic,
      rating: Number((4.2 + (clinic.id % 8) * 0.1).toFixed(1)),
      reviewCount: (clinic.id % 80) + 20,
      availableSlots: 0,
      image: 'assets/images/clinic-placeholder.jpg',
      specialty,
      distanceKm: Number((0.8 + (clinic.id % 15) * 0.35).toFixed(1)),
      isOpen: false
    };
  }

  private countAvailableSlots(slots: TimeSlot[]): number {
    return slots.filter((slot) => {
      const status = (slot as TimeSlot & { status?: string }).status;
      if (typeof status === 'string') {
        return status.toLowerCase() === 'available';
      }

      const available =
        slot.availableCount ?? Math.max((slot.capacity ?? 0) - (slot.bookedCount ?? 0), 0);
      return available > 0;
    }).length;
  }

  private loadSlotCounts(): void {
    if (this.clinics.length === 0) {
      this.applyFilters();
      return;
    }

    const requests = this.clinics.map((clinic) =>
      this.clinicService.getAvailableSlots(clinic.id).pipe(
        catchError(() => of([] as TimeSlot[])),
        map((slots) => ({ id: clinic.id, count: this.countAvailableSlots(slots) }))
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        const countMap = new Map(results.map((result) => [result.id, result.count]));
        this.clinics = this.clinics.map((clinic) => {
          const availableSlots = countMap.get(clinic.id) ?? 0;
          return {
            ...clinic,
            availableSlots,
            isOpen: this.computeIsOpen(availableSlots)
          };
        });
        this.applyFilters();
        this.cdr.markForCheck();
      },
      error: () => {
        this.applyFilters();
        this.cdr.markForCheck();
      }
    });
  }

  private computeIsOpen(availableSlots: number): boolean {
    const hour = new Date().getHours();
    return availableSlots > 0 && hour >= 8 && hour < 21;
  }

  resetFilters(): void {
    this.activeSpecialty = 'All';
    this.availabilityFilter = 'all';
    this.locationFilter = '';
    this.applyFilters();
  }

  setSpecialtyFilter(specialty: string): void {
    this.activeSpecialty = specialty;
    this.applyFilters();
  }

  setAvailabilityFilter(filter: AvailabilityFilter): void {
    this.availabilityFilter = filter;
    this.applyFilters();
  }

  setLocationFilter(location: string): void {
    this.locationFilter = this.locationFilter === location ? '' : location;
    this.applyFilters();
  }

  setSort(option: SortOption): void {
    this.sortBy = option;
    this.applyFilters();
  }

  toggleMapView(): void {
    this.mapView = !this.mapView;
  }

  applyFilters(): void {
    let results = this.clinics.filter((clinic) => {
      const matchesSpecialty =
        this.activeSpecialty === 'All' || clinic.specialty === this.activeSpecialty;

      const matchesAvailability =
        this.availabilityFilter === 'all' || (this.availabilityFilter === 'open' && clinic.isOpen);

      const matchesLocation =
        !this.locationFilter || clinic.clinicAddress.toLowerCase().includes(this.locationFilter.toLowerCase());

      return matchesSpecialty && matchesAvailability && matchesLocation;
    });

    results = this.sortClinics(results);
    this.filteredClinics = results;
  }

  private sortClinics(clinics: ClinicCard[]): ClinicCard[] {
    const sorted = [...clinics];

    if (this.sortBy === 'rating') {
      return sorted.sort((a, b) => b.rating - a.rating);
    }

    if (this.sortBy === 'distance') {
      return sorted.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return sorted.sort((a, b) => b.availableSlots - a.availableSlots || b.rating - a.rating);
  }

  bookClinic(id: number): void {
    this.router.navigate(['/clinic-details', id]);
  }

  isStarFilled(rating: number, starNumber: number): boolean {
    const r = Math.min(5, Math.max(0, rating));
    return starNumber <= Math.round(r);
  }

  trackByClinic(_index: number, clinic: ClinicCard): number {
    return clinic.id;
  }

  cardAnimationDelay(index: number): string {
    return `${Math.min(index, 12) * 70}ms`;
  }

  formatDistance(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }

  onGlowingCircleClick(): void {
    this.router.navigate(['/chatbot']);
  }
}
