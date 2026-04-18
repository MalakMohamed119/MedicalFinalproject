import { Routes } from '@angular/router';
import { NotFound } from './features/not-found/not-found';
import { authGuard } from './core/guards/auth.guard';
import { HomeForPatient } from './features/patient/home-for-patient';
import { ClinicDetails } from './features/patient/clinic-details/clinic-details';
import { PatientProfile } from './features/patient/patient-profile/patient-profile';
import { DoctorDashboard } from './features/doctor/dashboard/dashboard.component';
import { MyClinics } from './features/doctor/my-clinics/my-clinics.component';
import { TimeslotManagement } from './features/doctor/timeslot-management/timeslot-management.component';
import { ManageDoctors } from './features/admin/manage-doctors/manage-doctors.component';
import { AdminDashboard } from './features/admin/admin-dashboard/admin-dashboard.component';

import { Login } from './core/auth/login/login';
import { Register } from './core/auth/register/register';
import { LogoutComponent } from './core/auth/logout/logout.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  // Auth routes
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'logout', component: LogoutComponent },
  
  // Protected routes
  { 
    path: 'home-for-patient', 
    component: HomeForPatient,
    // canActivate: [authGuard]
  },
  {
    path: 'clinic-details',
    component: ClinicDetails
  },
  {
    path: 'profile',
    component: PatientProfile
  },
  { 
    path: 'doctor/dashboard', 
    component: DoctorDashboard,
    // canActivate: [authGuard]
  },
  { 
    path: 'doctor/my-clinics', 
    component: MyClinics,
    // canActivate: [authGuard]
  },
  { 
    path: 'doctor/manage-slots', 
    component: TimeslotManagement,
    canActivate: [authGuard]
  },
  {
    path: 'admin-dashboard',
    component: AdminDashboard
  },
  {
    path: 'admin/dashboard',
    redirectTo: '/admin-dashboard',
    pathMatch: 'full'
  },
  {
    path: 'system-dashboard',
    redirectTo: '/admin-dashboard',
    pathMatch: 'full'
  },
  { 
    path: 'admin/manage-doctors', 
    component: ManageDoctors,
    // canActivate: [authGuard]
  },
  
  // 404 - Not Found (keep this last)
  { path: '**', component: NotFound }
];
