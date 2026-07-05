import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

/**
 * Guard para las rutas normales (dashboard, tareas, cronometro, recordatorios,
 * categorias, reportes, perfil): si el que entra tiene rol "admin", lo redirige
 * a /admin en vez de dejarlo pasar, porque el admin solo debe usar su panel.
 */
export const bloquearAdminGuard: CanActivateFn = () => {
  const router = inject(Router);
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (usuario?.rol === 'admin') {
      router.navigate(['/admin']);
      return false;
    }
  } catch {
    // Si no se puede leer, dejamos pasar y que el authGuard normal
    // se encargue de la sesión.
  }
  return true;
};