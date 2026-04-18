import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {

  const router = inject(Router);
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

  console.log('Interceptor seeing request to:', req.url);
  console.log('Interceptor - Token found:', !!token);



  let modifiedReq = req;

  if (token && req.url.startsWith(environment.apiUrl)) {


    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.clear();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
}
