import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSidebarComponent } from '../shared/admin-sidebar/admin-sidebar.component';
import { ClinicService } from '../../../core/services/clinic.service';
import { ClinicResponse } from '../../../shared/models/clinic-response.interface';
import { formatAppError } from '../../../shared/utils/error-message.util';

@Component({
  selector: 'app-manage-clinics',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent],
  templateUrl: './manage-clinics.component.html',
  styleUrl: './manage-clinics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageClinicsComponent implements OnInit {
  private clinicService = inject(ClinicService);

  readonly clinics = signal<ClinicResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.loadClinics();
  }

  loadClinics(): void {
    this.loading.set(true);
    this.error.set('');

    this.clinicService.getAllClinics({ pageIndex: 0, pageSize: 1000 }).subscribe({
      next: (data) => {
        const clinics = Array.isArray(data)
          ? data
          : ((data as { data?: ClinicResponse[] })?.data ?? []);
        this.clinics.set(clinics);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(formatAppError(err, 'Failed to load clinics. Please try again.'));
        this.loading.set(false);
      }
    });
  }
}
