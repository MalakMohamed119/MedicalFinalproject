import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-doctor-footer',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './doctor-footer.component.html',
  styleUrl: './doctor-footer.component.scss'
})
export class DoctorFooterComponent {}

