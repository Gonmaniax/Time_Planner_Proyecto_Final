import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notificacion {
  id: number;
  tipo: 'exito' | 'error' | 'advertencia' | 'info';
  mensaje: string;
  timestamp: Date;
}

export interface ModalConfirm {
  visible: boolean;
  mensaje: string;
  callback: (() => void) | null;
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private contador = 0;

  // Toasts — aparecen y desaparecen
  toasts$ = new BehaviorSubject<Notificacion[]>([]);
  
  // Historial — permanece en la campana
  historial$ = new BehaviorSubject<Notificacion[]>([]);
  
  // Campana abierta/cerrada
  campanaAbierta$ = new BehaviorSubject<boolean>(false);
  
  // Sin leer
  sinLeer$ = new BehaviorSubject<number>(0);

  perfilAbierto$ = new BehaviorSubject<boolean>(false);

togglePerfil() {
  const abierto = !this.perfilAbierto$.value;
  this.perfilAbierto$.next(abierto);
  if (abierto) this.cerrarCampana();
}

cerrarPerfil() {
  this.perfilAbierto$.next(false);
}

  modalConfirm$ = new BehaviorSubject<ModalConfirm>({
    visible: false,
    mensaje: '',
    callback: null
  });

  private tiempos = {
    exito: 3000,
    info: 3000,
    error: 6000,
    advertencia: 8000
  };

  mostrar(mensaje: string, tipo: 'exito' | 'error' | 'advertencia' | 'info' = 'info') {
    const id = ++this.contador;
    const notif: Notificacion = { id, tipo, mensaje, timestamp: new Date() };

    // Agregar al toast
    this.toasts$.next([...this.toasts$.value, notif]);

    // Guardar en historial si es error o advertencia
    if (tipo === 'error' || tipo === 'advertencia') {
      this.historial$.next([notif, ...this.historial$.value].slice(0, 20));
      this.sinLeer$.next(this.sinLeer$.value + 1);
    }

    // Auto-quitar del toast
    setTimeout(() => this.quitarToast(id), this.tiempos[tipo]);
  }

  exito(mensaje: string) { this.mostrar(mensaje, 'exito'); }
  error(mensaje: string) { this.mostrar(mensaje, 'error'); }
  advertencia(mensaje: string) { this.mostrar(mensaje, 'advertencia'); }
  info(mensaje: string) { this.mostrar(mensaje, 'info'); }

  quitarToast(id: number) {
    this.toasts$.next(this.toasts$.value.filter(n => n.id !== id));
  }

  toggleCampana() {
    const abierta = !this.campanaAbierta$.value;
    this.campanaAbierta$.next(abierta);
    if (abierta) {
      this.sinLeer$.next(0);
      this.cerrarPerfil();
    }
  }

  cerrarCampana() {
    this.campanaAbierta$.next(false);
  }

  limpiarHistorial() {
    this.historial$.next([]);
    this.sinLeer$.next(0);
  }

  confirmar(mensaje: string, callback: () => void) {
    this.modalConfirm$.next({ visible: true, mensaje, callback });
  }

  aceptarConfirm() {
    const modal = this.modalConfirm$.value;
    if (modal.callback) modal.callback();
    this.cerrarConfirm();
  }

  cerrarConfirm() {
    this.modalConfirm$.next({ visible: false, mensaje: '', callback: null });
  }
}