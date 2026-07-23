import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const staffGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Seul le personnel interne (SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE) a accès au Back-Office
  if (authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'])) {
    return true;
  }

  // Les comptes clients sont redirigés vers la connexion avec un message de restriction
  authService.logout();
  router.navigate(['/login'], { queryParams: { error: 'client_access_restricted' } });
  return false;
};
