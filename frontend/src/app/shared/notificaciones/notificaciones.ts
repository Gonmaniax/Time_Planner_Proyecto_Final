import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionService, Notificacion, ModalConfirm } from '../../services/notificaciones.services';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.css'
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  toasts: Notificacion[] = [];
  modalConfirm: ModalConfirm = { visible: false, mensaje: '', callback: null };
  private subs: Subscription[] = [];

  constructor(
    public notifService: NotificacionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.subs.push(
      this.notifService.toasts$.subscribe((t: Notificacion[]) => {
        this.toasts = [...t];
        Promise.resolve().then(() => this.cdr.detectChanges());
      }),
      this.notifService.modalConfirm$.subscribe((m: ModalConfirm) => {
        this.modalConfirm = m;
        this.cdr.detectChanges();
      })
    );
  }

  getIcono(tipo: string): string {
    const iconos: any = {
      exito: 'exito', error: 'error', advertencia: 'advertencia', info: 'info'
    };
    return iconos[tipo] || 'info';
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}