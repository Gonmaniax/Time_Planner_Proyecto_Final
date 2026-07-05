import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import { RecordatoriosService, Recordatorio } from '../../services/recordatorios.service';
import { NotificacionService, Notificacion } from '../../services/notificaciones.services';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alertas.html',
  styleUrl: './alertas.css'
})
export class AlertasComponent implements OnInit, OnDestroy {
  pendientes: Recordatorio[] = [];
  historial: Notificacion[] = [];
  sinLeer = 0;
  abierta = false;
  private sub?: Subscription;

  constructor(
    private recordatoriosService: RecordatoriosService,
    public notifService: NotificacionService,
    private cdr: ChangeDetectorRef,
    private elRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.sub = combineLatest([
      this.recordatoriosService.pendientes$,
      this.notifService.historial$,
      this.notifService.sinLeer$,
      this.notifService.campanaAbierta$
    ]).subscribe(([pendientes, historial, sinLeer, abierta]) => {
      this.pendientes = pendientes;
      this.historial = historial;
      this.sinLeer = sinLeer;
      this.abierta = abierta;
      Promise.resolve().then(() => this.cdr.detectChanges());
    });
  }
  @HostListener('document:click', ['$event'])
  clickFuera(event: MouseEvent) {
  if (this.abierta && !this.elRef.nativeElement.contains(event.target)) {
    this.notifService.cerrarCampana();
  }
}

  get totalBadge(): number {
    return this.pendientes.length + this.sinLeer;
  }

  toggle(): void {
    this.notifService.cerrarPerfil();
    this.notifService.toggleCampana(); // ya resetea sinLeer a 0 internamente
  }

  posponer(id: number): void {
  this.recordatoriosService.posponer(id).subscribe({
    next: () => this.notifService.info('Recordatorio postergado'),
    error: () => this.notifService.error('No se pudo postergar el recordatorio')
  });
}

finalizar(id: number): void {
  this.recordatoriosService.finalizar(id).subscribe({
    next: () => this.notifService.exito('Recordatorio finalizado'),
    error: () => this.notifService.error('No se pudo finalizar el recordatorio')
  });
}

  getIcono(tipo: string): string {
    const iconos: any = { exito: 'exito', error: 'error', advertencia: 'advertencia', info: 'info' };
    return iconos[tipo] || 'info';
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}