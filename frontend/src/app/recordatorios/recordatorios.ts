import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RecordatoriosService, Recordatorio } from '../services/recordatorios.service';
import { TareasService, Tarea } from '../services/tareas.service';
import { NotificacionService } from '../services/notificaciones.services';
import { AlertasComponent } from '../shared/alertas/alertas';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-recordatorios',
  standalone: true,
  imports: [CommonModule, FormsModule,AlertasComponent],
  templateUrl: './recordatorios.html',
  styleUrl: './recordatorios.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecordatoriosComponent implements OnInit, OnDestroy {
  nombreUsuario: string = '';
  correoUsuario: string = '';
  perfilAbierto: boolean = false;
  @ViewChild('perfilWrap') perfilWrap?: ElementRef;
  private subPerfil?: Subscription;
  modalAbierto: boolean = false;
  recordatorios: Recordatorio[] = [];
  tareas: Tarea[] = [];
  menuMovilAbierto: boolean = false;

  forma = { id_tarea: '', fecha_hora: '', repetir_min: 0 };

  constructor(
    private router: Router,
    private recordatoriosService: RecordatoriosService,
    private tareasService: TareasService,
    private cdr: ChangeDetectorRef,
    private notificacionService: NotificacionService
  ) {}

  ngOnInit() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  this.nombreUsuario = usuario.nombre_usuario || 'Usuario';
  this.correoUsuario = usuario.correo || '';

   if (Notification.permission === 'default') {
     Notification.requestPermission();
    }
    this.recordatoriosService.iniciarPolling();

    this.subPerfil = this.notificacionService.perfilAbierto$.subscribe(v => {
      this.perfilAbierto = v;
      this.cdr.detectChanges();
    });

    this.recordatoriosService.lista$.subscribe(lista => {
      this.recordatorios = lista;
      this.cdr.detectChanges();
    });


    this.recordatoriosService.listar().subscribe(l =>
      this.recordatoriosService['listaSubject'].next(l)
    );

    this.tareasService.getTareas().subscribe(t => this.tareas = t);
  }

  togglePerfil() {
    this.notificacionService.cerrarCampana();
    this.notificacionService.togglePerfil();
  }

  toggleMenuMovil() {
    this.menuMovilAbierto = !this.menuMovilAbierto;
    this.cdr.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  clickFuera(event: MouseEvent) {
    if (
      this.perfilAbierto &&
      this.perfilWrap &&
      !this.perfilWrap.nativeElement.contains(event.target)
    ) {
      this.notificacionService.cerrarPerfil();
    }
  }

 
  abrirModal() { this.modalAbierto = true; }

  cerrarModal() {
    this.modalAbierto = false;
    this.forma = { id_tarea: '', fecha_hora: '', repetir_min: 0 };
  }

guardar() {
  if (!this.forma.id_tarea || !this.forma.fecha_hora) {
    this.notificacionService.info('Selecciona una tarea y una fecha/hora');
    return;
  }

  const repetirMin = this.forma.repetir_min > 0 ? this.forma.repetir_min : null;

  this.recordatoriosService
    .crear(Number(this.forma.id_tarea), this.forma.fecha_hora, repetirMin)
    .subscribe({
      next: () => {
        Promise.resolve().then(() => {
          this.notificacionService.exito('Recordatorio guardado');
          this.cerrarModal();
          this.cdr.detectChanges();   
        });
      },
      error: (err) => {
        console.error(err);
        const mensaje = err?.error?.error || 'No se pudo guardar el recordatorio';
        Promise.resolve().then(() => {
          this.notificacionService.error(mensaje);
          this.cdr.detectChanges();   
        });
      }
    });
}

  posponer(id: number): void {
    this.recordatoriosService.posponer(id).subscribe({
      next: () => this.notificacionService.info('Recordatorio postergado'),
      error: () => this.notificacionService.error('No se pudo postergar el recordatorio')
    });
  }

  finalizar(id: number): void {
    this.recordatoriosService.finalizar(id).subscribe({
      next: () => this.notificacionService.exito('Recordatorio finalizado'),
      error: () => this.notificacionService.error('No se pudo finalizar el recordatorio')
    });
  }

eliminar(id: number): void {
  this.recordatoriosService.eliminar(id).subscribe({
    next: () => {
      this.notificacionService.exito('Recordatorio eliminado');
      this.cdr.detectChanges();  
    },
    error: () => {
      this.notificacionService.error('No se pudo eliminar');
      this.cdr.detectChanges();   
    }
  });
}

  irA(ruta: string) {
    this.menuMovilAbierto = false;
    this.router.navigate(['/' + ruta]);
  }

  cerrarSesion() {
    this.recordatoriosService.detenerPolling();
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }

   ngOnDestroy() {
    this.subPerfil?.unsubscribe();
  }
  formatearFecha(fechaHora: string): string {
  const fecha = new Date(fechaHora);
  return fecha.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
}