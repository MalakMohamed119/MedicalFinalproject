import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
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

  return patientService.getMyProfile().pipe(
    map(() => true),
    catchError((error) => {
      if (error.status === 404) {
        return of(
          router.createUrlTree(['/complete-profile'], { queryParams: { returnUrl: state.url } })
        );
      }

      return of(true);
    })
  );
};
