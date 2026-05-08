import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {

  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  
  let token = null;
  if (isPlatformBrowser(platformId)) {
    token = localStorage.getItem('token');
  }

  console.log('🔍 Interceptor seeing request to:', req.url);
  console.log('🔍 Interceptor - Token found:', !!token);
  console.log('🔍 Interceptor - apiUrl:', environment.apiUrl);
  console.log('🔍 Interceptor - timeSlotsApiUrl:', environment.timeSlotsApiUrl);
  console.log('🔍 Interceptor - Request URL:', req.url);
  console.log('🔍 Interceptor - Starts with apiUrl?', req.url.startsWith(environment.apiUrl));
  console.log('🔍 Interceptor - Starts with timeSlotsApiUrl?', req.url.startsWith(environment.timeSlotsApiUrl));
  console.log('🔍 Interceptor - URL starts with timeSlotsApiUrl:', req.url.startsWith(environment.timeSlotsApiUrl));
  if (token) {
    console.log('🔍 Interceptor - Token preview:', token.substring(0, 50) + '...');
  }

  let modifiedReq = req;

  const shouldAttachToken = token && 
    (req.url.startsWith(environment.apiUrl) || req.url.startsWith(environment.timeSlotsApiUrl)) && 
    !req.url.includes('/auth/Clinic/Authentication/Login') && 
    !req.url.includes('/auth/Clinic/Authentication/Register');

  console.log('🔍 Interceptor - Should attach token:', shouldAttachToken);

  if (shouldAttachToken) {
    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('🔍 Interceptor - Token attached to request');
  } else {
    console.log('🔍 Interceptor - Token NOT attached to request');
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (isPlatformBrowser(platformId)) {
          localStorage.clear();
        }
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
}