import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError(err => {
      if (err.status === 401 && !req.url.includes('/auth/login')) {
        authService.logout();
      }

      let errorMsg = '';
      if (err.error) {
        if (typeof err.error === 'string') {
          try {
            const parsed = JSON.parse(err.error);
            errorMsg = parsed.message || parsed.error || err.error;
          } catch {
            errorMsg = err.error;
          }
        } else if (typeof err.error === 'object') {
          errorMsg = err.error.message || err.error.error;
        }
      }

      if (!errorMsg && err.message) {
        errorMsg = err.message;
      }

      if (errorMsg === 'Access Denied' || err.status === 403) {
        errorMsg = 'Accès refusé : privilèges insuffisants pour effectuer cette action.';
      }

      if (!errorMsg) {
        if (err.status === 401) {
          errorMsg = 'Email ou mot de passe incorrect';
        } else if (err.status === 0) {
          errorMsg = 'Impossible de contacter le serveur backend';
        } else {
          errorMsg = 'Une erreur est survenue';
        }
      }

      return throwError(() => new Error(errorMsg));
    })
  );
};
