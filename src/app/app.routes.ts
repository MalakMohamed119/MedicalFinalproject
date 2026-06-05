import { Routes } from '@angular/router';
import { NotFound } from './features/not-found/not-found';
import { authGuard } from './core/guards/auth.guard';
import { patientProfileGuard } from './core/guards/patient-profile.guard';
import { HomeForPatient } from './features/patient/home-for-patient';
import { ClinicDetails } from './features/patient/clinic-details/clinic-details';
import { PatientProfile } from './features/patient/patient-profile/patient-profile';
import { MyAppointments } from './features/patient/my-appointments/my-appointments.component';
import { CompleteProfileComponent } from './features/patient/complete-profile/complete-profile.component';
import { DoctorDashboard } from './features/doctor/dashboard/dashboard.component';
import { DoctorAppointments } from './features/doctor/appointments/appointments.component';
import { MyClinics } from './features/doctor/my-clinics/my-clinics.component';
import { TimeslotManagement } from './features/doctor/timeslot-management/timeslot-management.component';
import { ManageDoctorsComponent as ManageDoctors } from './features/admin/manage-doctors/manage-doctors.component';
import { AdminDashboardComponent as AdminDashboard } from './features/admin/admin-dashboard/admin-dashboard.component';
import { LandingComponent } from './features/landing/landing.component';

import { Login } from './core/auth/login/login';
import { Register } from './core/auth/register/register';
import { LogoutComponent } from './core/auth/logout/logout.component';
import { AddDoctorComponent } from './features/admin/add-doctor/add-doctor.component';
import { ManageClinicsComponent } from './features/admin/manage-clinics/manage-clinics.component';
import { ManageAppointmentsComponent } from './features/admin/manage-appointments/manage-appointments.component';
import { ChatbotComponent } from './features/patient/chatbot/chatbot.component';


export const routes: Routes = [
  { path: '', component: LandingComponent },
  
  // Auth routes
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'logout', component: LogoutComponent },
  { path: 'complete-profile', component: CompleteProfileComponent, canActivate: [authGuard] },
  
  // Protected routes
  { 
    path: 'home-for-patient', 
    component: HomeForPatient,
   canActivate: [authGuard, patientProfileGuard]
  },
  {
    path: 'clinic-details',
    component: ClinicDetails,
    canActivate: [patientProfileGuard]
  },
  {
    path: 'clinic-details/:id',
    component: ClinicDetails,
    canActivate: [patientProfileGuard]
  },
  {
    path: 'profile',
    component: PatientProfile,
    canActivate: [authGuard, patientProfileGuard]
  },
  {
    path: 'my-appointments',
    component: MyAppointments,
    canActivate: [authGuard, patientProfileGuard]
  },
  {
    path: 'chatbot',
    component: ChatbotComponent,
    canActivate: [authGuard, patientProfileGuard]
  },
  { 
    path: 'doctor/dashboard', 
    component: DoctorDashboard,
   canActivate: [authGuard]
  },
  { 
    path: 'doctor/appointments', 
    component: DoctorAppointments,
   canActivate: [authGuard]
  },
  { 
    path: 'doctor/my-clinics', 
    component: MyClinics,
   canActivate: [authGuard]
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
    path: 'admin/manage-doctors', 
    component: ManageDoctors,
   canActivate: [authGuard]
  },
  {
    path: 'admin/manage-clinics',
    component: ManageClinicsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'admin/manage-appointments',
    component: ManageAppointmentsComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'admin/add-doctor', 
    component: AddDoctorComponent
  },
  
//  404 - Not Found (keep this last)
  { path: '**', component: NotFound }

];
