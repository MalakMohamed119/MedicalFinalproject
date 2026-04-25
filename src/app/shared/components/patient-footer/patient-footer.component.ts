import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient-footer',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './patient-footer.component.html',
  styleUrl: './patient-footer.component.scss'
})
export class PatientFooterComponent {}

