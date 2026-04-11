import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { ClinicResponse } from '../../../shared/models/clinic-response.interface';

@Component({
  selector: 'app-my-clinics',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  templateUrl: './my-clinics.component.html',
  styleUrls: ['./my-clinics.component.scss']
})
export class MyClinics {
  clinics: ClinicResponse[] = [];
}
