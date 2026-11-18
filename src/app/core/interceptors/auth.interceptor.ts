import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const LOGIN_PATH = '/client-auth/login';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token;

  const request = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginRequest = req.url.includes(LOGIN_PATH);

      // Hanya akhiri sesi bila token memang sudah expired.
      // 401 lain (mis. salah password) tidak boleh menghapus sesi.
      if (error?.status === 401 && !isLoginRequest && authService.isTokenExpired()) {
        authService.handleSessionExpired();
      }

      return throwError(() => error);
    }),
  );
};
