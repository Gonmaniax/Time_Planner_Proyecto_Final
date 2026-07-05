import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TareasService } from '../services/tareas.service';
import { CronometroService, EstadoCronometro } from '../services/cronometro.service';
import { Subscription } from 'rxjs';
import { NotificacionService } from '../services/notificaciones.services';
import { AlertasComponent } from '../shared/alertas/alertas';
import { RecordatoriosService} from '../services/recordatorios.service';

interface Sesion {
  nombre: string;
  duracion: number;
  resultado: string;
}

@Component({
  selector: 'app-cronometro',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertasComponent],
  templateUrl: './cronometro.html',
  styleUrl: './cronometro.css'
})
export class CronometroComponent implements OnInit, OnDestroy {

  nombreUsuario: string = '';
  correoUsuario: string = '';
  perfilAbierto: boolean = false;
  menuMovilAbierto: boolean = false;
  @ViewChild('perfilWrap') perfilWrap?: ElementRef;
  private subPerfil?: Subscription;
  tareas: any[] = [];
  tareaSeleccionada: string = '';
  sesiones: Sesion[] = [];
  menuBorrarAbierto: boolean = false;
  notificacionPermiso: boolean = false;
  estado!: EstadoCronometro;
  alertaActiva: boolean = false;
  modalCompletado: boolean = false;
  private sub!: Subscription;
  private alertaEnviada: boolean = false;
  

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private tareasService: TareasService,
    public cronometroService: CronometroService,
    private cdr: ChangeDetectorRef,
    private notif: NotificacionService,
    private recordatoriosService: RecordatoriosService
  ) {}

  ngOnInit() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    this.nombreUsuario = usuario.nombre_usuario || 'Usuario';
    this.correoUsuario = usuario.correo || '';
    this.pedirPermisoNotificaciones();
    this.subPerfil = this.notif.perfilAbierto$.subscribe(v => {
      this.perfilAbierto = v;
      this.cdr.detectChanges();
    });

    // Una sola suscripción limpia al estado
    this.sub = this.cronometroService.estado$.subscribe(estado => {
      this.estado = estado;

      const restante = estado.segundosTotales - estado.segundosTranscurridos;

      if (restante === 120 && !this.alertaEnviada && estado.corriendo) {
        this.alertaActiva = true;
        this.alertaEnviada = true;
      }

      if (estado.segundosTranscurridos > 0
          && estado.segundosTranscurridos >= estado.segundosTotales
          && estado.segundosTotales > 0
          && estado.segundosTranscurridos >= 3
          && !estado.corriendo
          && estado.tareaActiva
          && !this.modalCompletado) {
        this.modalCompletado = true;
      }

      this.cdr.detectChanges();
    });

    // Cargar tareas
    this.tareasService.getTareas().subscribe({
      next: (res: any) => {
        this.tareas = res.filter((t: any) => t.estado !== 'completada');
        this.cdr.detectChanges();
        this.cargarSesionesHoy();

        if (this.cronometroService.getEstado().tareaActiva) {
          this.tareaSeleccionada = String(this.cronometroService.getEstado().tareaActiva.id);
        }

        this.route.queryParams.subscribe(params => {
          if (params['tareaId']) {
            const tarea = this.tareas.find(t => t.id === Number(params['tareaId']));
            if (tarea) {
              this.tareaSeleccionada = String(tarea.id);
              this.cronometroService.seleccionarTarea(tarea);
            }
          }
        });
      },
      error: (err: any) => console.error('Error cargando tareas:', err)
    });
  }

  get tareaActiva() { return this.estado?.tareaActiva; }
  get corriendo() { return this.estado?.corriendo; }
  get segundosTranscurridos() { return this.estado?.segundosTranscurridos || 0; }

  get tiempoMostrado(): string {
  if (!this.estado || this.estado.segundosTotales === 0) return '00:00';
  const restante = Math.max(0, this.estado.segundosTotales - this.estado.segundosTranscurridos);
  const horas = Math.floor(restante / 3600);
  const minutos = Math.floor((restante % 3600) / 60);
  const segundos = restante % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (horas > 0) return `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
  return `${pad(minutos)}:${pad(segundos)}`;
}

  get porcentaje(): number {
    if (!this.estado || this.estado.segundosTotales === 0) return 0;
    return Math.floor((this.estado.segundosTranscurridos / this.estado.segundosTotales) * 100);
  }

  get dashOffset(): number {
    return 553 - (553 * this.porcentaje / 100);
  }

  pedirPermisoNotificaciones() {
    if ('Notification' in window) {
      Notification.requestPermission().then(p => {
        this.notificacionPermiso = p === 'granted';
      });
    }
  }

  enviarNotificacion(titulo: string, mensaje: string) {
    if (this.notificacionPermiso) {
      new Notification(titulo, { body: mensaje, icon: '/favicon.ico' });
    }
  }

  cargarSesionesHoy() {
    this.tareasService.getSesionesHoy().subscribe({
      next: (res: any) => {
        this.tareasService.getTareas().subscribe({
          next: (todas: any) => {
            this.sesiones = res.map((s: any) => {
              const tarea = todas.find((t: any) => t.id === s.id_tarea);
              return {
                nombre: tarea ? tarea.titulo : 'Tarea',
                duracion: s.duracion_min,
                resultado: s.resultado
              };
            });
            this.cdr.detectChanges();
          }
        });
      },
      error: (err: any) => console.error('Error cargando sesiones:', err)
    });
  }

  guardarSesion(resultado: string) {
    const estado = this.cronometroService.getEstado();
    if (!estado.tareaActiva || !estado.inicioSesion) return;

    const fin = new Date();
    const duracion = Math.floor(estado.segundosTranscurridos / 60) || 1;

    this.tareasService.crearSesion({
      id_tarea: estado.tareaActiva.id,
      inicio: estado.inicioSesion.toISOString(),
      fin: fin.toISOString(),
      duracion_min: duracion,
      resultado
    }).subscribe({
      next: () => this.cargarSesionesHoy(),
      error: (err: any) => console.error('Error guardando sesión:', err)
    });
  }

  seleccionarTarea() {
    const tarea = this.tareas.find(t => t.id === Number(this.tareaSeleccionada));
    if (tarea) {
      this.cronometroService.seleccionarTarea(tarea);
      this.alertaActiva = false;
      this.alertaEnviada = false;
      this.modalCompletado = false;
    }
  }

  iniciar() {
  if (!this.tareaActiva) return;
  if (!this.tareaActiva.tiempo_estimado_min || this.tareaActiva.tiempo_estimado_min <= 0) {
    this.notif.advertencia('Esta tarea no tiene tiempo asignado. Edítala primero.');
    return;
  }
  this.cronometroService.iniciar(this.tareaActiva);
}
  pausar() { this.cronometroService.pausar(); }

  private deteniendo = false;

detener() {
  if (this.deteniendo) return; 
  this.deteniendo = true;
  this.guardarSesion('interrumpida');
  this.cronometroService.detener();
  this.modalCompletado = false;
  this.alertaActiva = false;
  this.alertaEnviada = false;
  setTimeout(() => this.deteniendo = false, 1000);
}

 completarTarea() {
  const tareaId = this.estado?.tareaActiva?.id;
  this.guardarSesion('completada');

  if (tareaId) {
    this.tareasService.actualizarTarea(tareaId, { estado: 'completada' }).subscribe({
      error: (err) => console.error('Error marcando la tarea como completada:', err)
    });
  }

  setTimeout(() => {                
    this.cronometroService.detener();
    this.cronometroService.limpiar();
    this.modalCompletado = false;
    this.alertaActiva = false;
    this.alertaEnviada = true;      
    this.tareaSeleccionada = '';
    this.tareasService.getTareas().subscribe({
      next: (res: any) => {
        this.tareas = res.filter((t: any) => t.estado !== 'completada');
        this.cdr.detectChanges();
      }
    });
    this.cargarSesionesHoy();
  }, 300);
}
  agregarTiempo() {
    this.guardarSesion('tiempo_extra');
    this.cronometroService.agregarTiempo(300);
    this.modalCompletado = false;
    this.alertaActiva = false;
    this.alertaEnviada = false;
    this.cronometroService.iniciar(this.tareaActiva);
  }

  cerrarModal() {
    this.guardarSesion('interrumpida');
    this.modalCompletado = false;
  }

  borrarHistorial(tipo?: string) {
    const mensajes: any = {
      'completada': '¿Borrar solo las sesiones completadas de hoy?',
      'interrumpida': '¿Borrar solo las sesiones interrumpidas de hoy?',
      'tiempo_extra': '¿Borrar solo las sesiones con tiempo extra de hoy?',
      'todo': '¿Borrar TODO el historial de hoy?'
    };
    this.menuBorrarAbierto = false;
    this.notif.confirmar(mensajes[tipo || 'todo'], () => {
      this.tareasService.eliminarSesionesHoy(tipo).subscribe({
        next: () => {
          this.notif.exito('Historial eliminado');
          this.cargarSesionesHoy();
        },
        error: () => this.notif.error('No se pudo eliminar el historial')
      });
    });
  }

  pad(n: number): string { return n.toString().padStart(2, '0'); }
  togglePerfil() {
    this.notif.cerrarCampana();
    this.notif.togglePerfil();
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
      this.notif.cerrarPerfil();
    }
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
    this.sub?.unsubscribe();
    this.subPerfil?.unsubscribe();
  }

 terminarAntes(): void {
  this.guardarSesion('completada');
  const tareaId = this.tareaActiva?.id;
  setTimeout(() => {
    
    if (tareaId) {
      this.tareasService.actualizarTarea(tareaId, { estado: 'completada' }).subscribe({
        error: () => this.notif.error('No se pudo marcar la tarea como completada')
      });
    }
    this.cronometroService.detener();
    this.cronometroService.limpiar();
    this.modalCompletado = false;
    this.alertaActiva = false;
    this.alertaEnviada = true;
    this.tareaSeleccionada = '';
    this.notif.exito('¡Tarea completada antes del tiempo estimado!');
    this.tareasService.getTareas().subscribe({
      next: (res: any) => {
        this.tareas = res.filter((t: any) => t.estado !== 'completada');
        this.cdr.detectChanges();
      }
    });
    this.cargarSesionesHoy();
  }, 300);
}
}