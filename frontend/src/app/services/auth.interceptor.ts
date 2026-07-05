import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, EMPTY } from 'rxjs';
import { CronometroService } from './cronometro.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const cronometroService = inject(CronometroService);
  const token = localStorage.getItem('token');

  const esRutaPublica = req.url.includes('/auth/login')
    || req.url.includes('/auth/registro')
    || req.url.includes('/recuperacion/');

  const esExportacion = req.url.includes('/reportes/exportar');

  if (!token && !esRutaPublica) {
    router.navigate(['/login']);
    return EMPTY;
  }

  // Adjunta el token automáticamente a toda petición protegida.
  // Ningún servicio tiene que volver a llamar getHeaders() manualmente.
  const reqConToken = (token && !esRutaPublica)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(reqConToken).pipe(
    catchError(err => {
      if (esExportacion) {
        return throwError(() => err);
      }
      if (err.status === 422 || err.status === 401) {
        cronometroService.limpiar();
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};