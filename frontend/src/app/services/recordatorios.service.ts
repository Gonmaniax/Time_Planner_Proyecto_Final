import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, switchMap, startWith, catchError, of, tap, Subscription } from 'rxjs';
import { NotificacionService } from './notificaciones.services';
import { environment } from '../environments/environment';
export interface Recordatorio {
  id: number;
  id_tarea: number;
  titulo_tarea: string | null;
  fecha_hora: string;
  repetir_min: number | null;
  activo: boolean;
  atendido: boolean;
}

const API_URL = `${environment.apiUrl}/recordatorios`;

@Injectable({ providedIn: 'root' })
export class RecordatoriosService {
  private pendientesSubject = new BehaviorSubject<Recordatorio[]>([]);
  public pendientes$ = this.pendientesSubject.asObservable();

  private listaSubject = new BehaviorSubject<Recordatorio[]>([]);
  public lista$ = this.listaSubject.asObservable();

  // IDs que ya se notificaron en esta sesión, para no repetir el toast cada 30s
  private idsYaNotificados = new Set<number>();
  private pollingActivo = false;
  private subscripcionPolling: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private notificacionService: NotificacionService
  ) {   
  }

  iniciarPolling(): void {
    if (this.pollingActivo) return; // evita doble arranque
    this.pollingActivo = true;
    this.subscripcionPolling = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.obtenerPendientes().pipe(catchError(() => of([])))
        )
      )
      .subscribe(pendientes => {
      Promise.resolve().then(() => { 
          this.notificarNuevos(pendientes);
          this.pendientesSubject.next(pendientes);
        });
      });
  }

  detenerPolling(): void {
    if (this.subscripcionPolling) {
      this.subscripcionPolling.unsubscribe();
      this.subscripcionPolling = null;
    }
    this.pollingActivo = false;
  }

  private notificarNuevos(pendientes: Recordatorio[]): void {
    for (const r of pendientes) {
      if (!this.idsYaNotificados.has(r.id)) {
        this.idsYaNotificados.add(r.id);
        this.dispararNotificacion(r);
      }
    }
  }

  private dispararNotificacion(r: Recordatorio): void {
    const mensaje = `Recordatorio: ${r.titulo_tarea ?? 'Tarea'}`;

    // Toast propio (reutilizando tu sistema existente)
    this.notificacionService.info(mensaje);

    // Notificación del navegador, si hay permiso
    if (Notification.permission === 'granted') {
      new Notification('Time Planner', { body: mensaje });
    }
  }

  obtenerPendientes(): Observable<Recordatorio[]> {
    const ahora = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    return this.http.get<Recordatorio[]>(`${API_URL}/pendientes?ahora=${ahora}`);
  }

  listar(): Observable<Recordatorio[]> {
    return this.http.get<Recordatorio[]>(API_URL);
  }

  crear(idTarea: number, fechaHora: string, repetirMin: number | null): Observable<Recordatorio> {
    return this.http.post<Recordatorio>(API_URL, {
      id_tarea: idTarea,
      fecha_hora: fechaHora,
      repetir_min: repetirMin
    }).pipe(
      tap(() => Promise.resolve().then(() => this.refrescarAhora()))
    );
  }

  posponer(id: number): Observable<Recordatorio> {
    return this.http.put<Recordatorio>(`${API_URL}/${id}`, { accion: 'posponer' }).pipe(
      tap(() => {
        this.idsYaNotificados.delete(id);
        Promise.resolve().then(() => this.refrescarAhora());
      })
    );
  }

  finalizar(id: number): Observable<Recordatorio> {
    return this.http.put<Recordatorio>(`${API_URL}/${id}`, { accion: 'finalizar' }).pipe(
      tap(() => Promise.resolve().then(() => this.refrescarAhora()))  
    );
  }

  desactivar(id: number): Observable<Recordatorio> {
    return this.http.put<Recordatorio>(`${API_URL}/${id}`, { accion: 'desactivar' }).pipe(
      tap(() => this.refrescarAhora())
    );
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/${id}`).pipe(
      tap(() => Promise.resolve().then(() => this.refrescarAhora()))  
    );
  }

  private refrescarAhora(): void {
    this.obtenerPendientes().subscribe(p =>
      Promise.resolve().then(() => this.pendientesSubject.next(p))  
    );
    this.listar().subscribe(l =>
      Promise.resolve().then(() => this.listaSubject.next(l))  
    );
  }
}
