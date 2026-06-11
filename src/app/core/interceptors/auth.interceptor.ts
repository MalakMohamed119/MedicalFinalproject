import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const isAuthRequest =
    req.url.includes('/auth/Clinic/Authentication/Login') ||
    req.url.includes('/auth/Clinic/Authentication/Register') ||
    req.url.includes('/auth/Clinic/Authentication/Refresh') ||
    req.url.includes('/Clinic/Authentication/Login') ||
    req.url.includes('/Clinic/Authentication/Register') ||
    req.url.includes('/Clinic/Authentication/Refresh');

  const isChatbotRequest = req.url.includes('/api/chatbot/analyze');

  const token = isPlatformBrowser(platformId) ? normalizeToken(localStorage.getItem('token')) : null;
  const shouldAttachToken =
    !!token &&
    (req.url.startsWith(environment.apiUrl) || 
     req.url.startsWith(environment.timeSlotsApiUrl) ||
     req.url.startsWith(environment.chatbotApiUrl)) &&
    !isAuthRequest;

  const modifiedReq = shouldAttachToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthRequest && isPlatformBrowser(platformId)) {
        localStorage.clear();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
}

function normalizeToken(token: string | null): string {
  if (!token) {
    return '';
  }

  return token
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}
