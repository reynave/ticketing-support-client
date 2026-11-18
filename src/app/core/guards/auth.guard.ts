import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return true;
  }

  const tokenExpired = authService.isTokenExpired();

  if (tokenExpired) {
    // Token masih tersimpan tapi sudah expired: bersihkan agar tidak dipakai lagi.
    authService.logout(false);

    return router.createUrlTree(['/login'], { queryParams: { reason: 'expired' } });
  }

  return router.createUrlTree(['/login']);
};
