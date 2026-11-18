import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return router.createUrlTree(['/cases']);
  }

  if (authService.isTokenExpired()) {
    // Token lama sudah expired: bersihkan supaya user harus login ulang.
    authService.logout(false);
  }

  return true;
};
