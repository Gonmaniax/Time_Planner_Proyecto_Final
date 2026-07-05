import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TareasService } from '../services/tareas.service';
import { CronometroService } from '../services/cronometro.service';
import { NotificacionService } from '../services/notificaciones.services';
import { Subscription } from 'rxjs';
import { AlertasComponent } from '../shared/alertas/alertas';
import { RecordatoriosService} from '../services/recordatorios.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule,AlertasComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy {

  fechaHoy: string = '';
  nombreUsuario: string = '';
  correoUsuario: string = '';
  perfilAbierto: boolean = false;
  menuMovilAbierto: boolean = false;
  @ViewChild('perfilWrap') perfilWrap?: ElementRef;
  private subPerfil?: Subscription;
  totalHoy: number = 0;
  totalPendientes: number = 0;
  totalCompletadas: number = 0;
  tareasHoy: any[] = [];
  private sub!: Subscription;

  constructor(
    private router: Router,
    private tareasService: TareasService,
    public cronometroService: CronometroService,
    private cdr: ChangeDetectorRef,
    private notif: NotificacionService,
    private recordatoriosService: RecordatoriosService
  ) {}

  ngOnInit() {
    const hoy = new Date();
    this.fechaHoy = hoy.toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    this.nombreUsuario = usuario.nombre_usuario || 'Usuario';
    this.correoUsuario = usuario.correo || '';
    this.cargarTareas();

    this.subPerfil = this.notif.perfilAbierto$.subscribe(v => {
      this.perfilAbierto = v;
      this.cdr.detectChanges();
    });

    this.sub = this.cronometroService.estado$.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

cargarTareas() {
  this.tareasService.getTareas().subscribe({
    next: (res: any) => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      // Filtrar tareas de hoy — tienen fecha_limite de hoy O fueron creadas hoy
      this.tareasHoy = res.filter((t: any) => {
        // Tareas con fecha límite hoy
        if (t.fecha_limite) {
          const limite = new Date(t.fecha_limite + 'T12:00:00');
          limite.setHours(0, 0, 0, 0);
          return limite.getTime() === hoy.getTime();
        }
        // Tareas sin fecha límite creadas hoy
        if (t.fecha_creacion) {
          const creacion = new Date(t.fecha_creacion);
          creacion.setHours(0, 0, 0, 0);
          return creacion.getTime() === hoy.getTime();
        }
        return false;
      });

      this.totalHoy = this.tareasHoy.length;
      this.totalPendientes = this.tareasHoy.filter((t: any) => t.estado === 'pendiente').length;
      this.totalCompletadas = this.tareasHoy.filter((t: any) => t.estado === 'completada').length;
      this.cdr.detectChanges();
    },
    error: (err: any) => console.error('Error cargando tareas', err)
  });
}

  iniciarCronometro(tarea: any) {
    this.cronometroService.iniciar(tarea);
  }

  irACronometro() {
    this.router.navigate(['/cronometro']);
  }

  irA(ruta: string) {
    this.menuMovilAbierto = false;
    this.router.navigate(['/' + ruta]);
  }
  
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
}