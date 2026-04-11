import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { DoctorResponse } from '../../../shared/models/doctor-response.interface';

@Component({
  selector: 'app-manage-doctors',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  templateUrl: './manage-doctors.component.html',
  styleUrls: ['./manage-doctors.component.scss']
})
export class ManageDoctors {
  doctors: DoctorResponse[] = [];
}
