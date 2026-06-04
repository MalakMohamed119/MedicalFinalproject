import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PatientService } from '../services/patient.service';

export const patientProfileGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const patientService = inject(PatientService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (authService.getRole() !== 'Patient') {
    return true;
  }

  return patientService.hasPatientProfile().pipe(
    map((hasProfile) => {
      if (!hasProfile) {
        return (
          router.createUrlTree(['/complete-profile'], { queryParams: { returnUrl: state.url } })
        );
      }

      return true;
    })
  );
};
