import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

export interface Tarea {
  id: number;
  id_usuario: number;
  id_categoria: number;
  titulo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  tiempo_estimado_min: number;
  tiempo_real_min: number;
  fecha_creacion: string;
  fecha_limite: string | null;
}

@Injectable({ providedIn: 'root' })
export class TareasService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient, private auth: AuthService) {}

  // ── TAREAS ──
  getTareasHoy() {
    return this.http.get<Tarea[]>(`${this.API}/tareas/hoy`,
      { headers: this.auth.getHeaders() });
  }

  getTareas() {
    return this.http.get<Tarea[]>(`${this.API}/tareas`,
      { headers: this.auth.getHeaders() });
  }

  crearTarea(tarea: any) {
    return this.http.post(`${this.API}/tareas`, tarea,
      { headers: this.auth.getHeaders() });
  }

  actualizarTarea(id: number, tarea: any) {
    return this.http.put(`${this.API}/tareas/${id}`, tarea,
      { headers: this.auth.getHeaders() });
  }

  eliminarTarea(id: number) {
    return this.http.delete(`${this.API}/tareas/${id}`,
      { headers: this.auth.getHeaders() });
  }

  // ── CATEGORÍAS ──
  getCategorias() {
    return this.http.get(`${this.API}/categorias`,
      { headers: this.auth.getHeaders() });
  }

  crearCategoria(nombre: string) {
    return this.http.post(`${this.API}/categorias`,
      { nombre },
      { headers: this.auth.getHeaders() });
  }

  editarCategoria(id: number, nombre: string) {
    return this.http.put(`${this.API}/categorias/${id}`,
      { nombre },
      { headers: this.auth.getHeaders() });
  }

  eliminarCategoria(id: number) {
    return this.http.delete(`${this.API}/categorias/${id}`,
      { headers: this.auth.getHeaders() });
  }

  // ── Sesiones de Cronometro ──
  crearSesion(sesion: any) {
    return this.http.post(`${this.API}/sesiones`, sesion,
      { headers: this.auth.getHeaders() });
  }

  getSesionesHoy() {
    return this.http.get(`${this.API}/sesiones/hoy`,
      { headers: this.auth.getHeaders() });
  }

  eliminarSesionesHoy(tipo?: string) {
    const params = tipo ? `?tipo=${tipo}` : '';
    return this.http.delete(`${this.API}/sesiones/hoy${params}`,
      { headers: this.auth.getHeaders() });
  }

  // ── Reportes ──
  getReporteSemana() {
    return this.http.get(`${this.API}/reportes/semana`,
      { headers: this.auth.getHeaders() });
  }

  exportarReporte(formato: string) {
     return this.http.get(`${this.API}/reportes/exportar?formato=${formato}`,
    {
      headers: this.auth.getHeaders(),
      responseType: 'blob' as 'json'
    });
}
}