import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { NotificacionService } from './notificaciones.services';

export interface EstadoCronometro {
  corriendo: boolean;
  tareaActiva: any | null;
  segundosTotales: number;
  segundosTranscurridos: number;
  inicioSesion: Date | null;
}

@Injectable({ providedIn: 'root' })
export class CronometroService {
  constructor(private notifService: NotificacionService) {}
  private estado: EstadoCronometro = {
    corriendo: false,
    tareaActiva: null,
    segundosTotales: 0,
    segundosTranscurridos: 0,
    inicioSesion: null
    
  };

private intervalo: any = null;
private tiempoOriginal: number = 0;
tiempoCompletado$ = new Subject<void>();
estado$ = new BehaviorSubject<EstadoCronometro>({ ...this.estado });

iniciar(tarea: any) {
  if (!this.estado.tareaActiva || this.estado.tareaActiva.id !== tarea.id) {
    this.estado.tareaActiva = tarea;
    this.estado.segundosTotales = tarea.tiempo_estimado_min * 60;
    this.tiempoOriginal = tarea.tiempo_estimado_min * 60;
    this.estado.segundosTranscurridos = 0;
    this.estado.inicioSesion = new Date();
  }
  this.estado.corriendo = true;
  this.estado.inicioSesion = this.estado.inicioSesion || new Date();
  clearInterval(this.intervalo);
  this.intervalo = setInterval(() => {
    this.estado.segundosTranscurridos++;
    this.estado$.next({ ...this.estado });

    // Alerta 2 minutos desde el servicio
    const restante = this.estado.segundosTotales - this.estado.segundosTranscurridos;
    if (restante === 120 && this.estado.segundosTotales > 120) {
       this.enviarNotificacionNativa('⏰ Time Planner', `Quedan 2 minutos: ${this.estado.tareaActiva?.titulo}`);
       this.notifService.info(`⏰ Quedan 2 minutos: ${this.estado.tareaActiva?.titulo}`);
    }

    // Fin del tiempo
   if (this.estado.segundosTranscurridos >= this.estado.segundosTotales
      && this.estado.segundosTotales > 0
      && this.estado.segundosTranscurridos >= 3) { 
      this.pausar();
      this.enviarNotificacionNativa('✅ ¡Tiempo completado!', `¿Completaste "${this.estado.tareaActiva?.titulo}"?`);
      this.notifService.exito(`✅ Tiempo completado: ${this.estado.tareaActiva?.titulo}`);
      this.tiempoCompletado$.next();
}
  }, 1000);
  this.estado$.next({ ...this.estado });
}
enviarNotificacionNativa(titulo: string, mensaje: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notif = new Notification(titulo, {
      body: mensaje,
      icon: '/favicon.ico',
      requireInteraction: true
    });
    notif.onclick = () => { 
      window.focus();
      window.location.href = '/cronometro';
    };
  }
}
  pausar() {
  this.estado.corriendo = false;
  clearInterval(this.intervalo);
  // Si el tiempo se agotó, resetear automáticamente
  if (this.estado.segundosTranscurridos >= this.estado.segundosTotales && this.estado.segundosTotales > 0) {
    this.estado.segundosTranscurridos = this.estado.segundosTotales;
  }
  this.estado$.next({ ...this.estado });
}
detener() {
  this.pausar();
  const estadoFinal = { ...this.estado };
  this.estado.segundosTotales = this.tiempoOriginal;
  this.estado.segundosTranscurridos = 0;
  this.estado.inicioSesion = null;
  this.estado$.next({ ...this.estado });
  return estadoFinal;
}
reiniciar() {
  this.pausar();
  this.estado.segundosTotales = this.tiempoOriginal;
  this.estado.segundosTranscurridos = 0;
  this.estado.inicioSesion = null;
  this.estado$.next({ ...this.estado });
}

limpiar() {
  this.pausar();
  this.estado.tareaActiva = null;
  this.estado.segundosTotales = 0;
  this.estado.segundosTranscurridos = 0;
  this.estado.inicioSesion = null;
  this.tiempoOriginal = 0;
  this.estado$.next({ ...this.estado });
}
  seleccionarTarea(tarea: any) {
  this.pausar();
  this.estado.tareaActiva = tarea;
  this.estado.segundosTotales = tarea.tiempo_estimado_min * 60;
  this.tiempoOriginal = tarea.tiempo_estimado_min * 60; 
  this.estado.segundosTranscurridos = 0;
  this.estado.inicioSesion = null;
  this.estado$.next({ ...this.estado });
}

  agregarTiempo(segundos: number) {
    this.estado.segundosTotales += segundos;
    this.estado$.next({ ...this.estado });
  }

  getEstado(): EstadoCronometro {
    return { ...this.estado };
  }

  get tiempoMostrado(): string {
    const restante = this.estado.segundosTotales - this.estado.segundosTranscurridos;
    const horas = Math.floor(restante / 3600);
    const minutos = Math.floor((restante % 3600) / 60);
    const segundos = restante % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (horas > 0) return `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
    return `${pad(minutos)}:${pad(segundos)}`;
  }

  get porcentaje(): number {
    if (this.estado.segundosTotales === 0) return 0;
    return Math.floor((this.estado.segundosTranscurridos / this.estado.segundosTotales) * 100);
  }

  get dashOffset(): number {
    return 553 - (553 * this.porcentaje / 100);
  }
}