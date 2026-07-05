import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TareasService } from '../services/tareas.service';
import { NotificacionService } from '../services/notificaciones.services';
import { AlertasComponent } from '../shared/alertas/alertas';
import { Subscription } from 'rxjs';
import { RecordatoriosService} from '../services/recordatorios.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, AlertasComponent],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class ReportesComponent implements OnInit,OnDestroy {
  nombreUsuario = '';
  correoUsuario = '';
  perfilAbierto = false;
  menuMovilAbierto = false;
  @ViewChild('perfilWrap') perfilWrap?: ElementRef;
  private subPerfil?: Subscription;
  fechaSemana = '';
  cargando = true;
  totalTareas = 0;
  completadas = 0;
  pendientes = 0;
  enProgreso = 0;
  tiempoTotal = '0 min';
  porCategoria: any[] = [];
  porDia: any[] = [];
  detalleTareas: any[] = [];
  maxMinutosDia = 1;

  constructor(
    private router: Router,
    private tareasService: TareasService,
    private notif: NotificacionService,
    private cdr: ChangeDetectorRef,
    private recordatoriosService: RecordatoriosService
  ) {}

  ngOnInit() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    this.nombreUsuario = usuario.nombre_usuario || 'Usuario';
    this.correoUsuario = usuario.correo || '';
    this.cargarReporte();
    this.subPerfil = this.notif.perfilAbierto$.subscribe(v => {
      this.perfilAbierto = v;
      this.cdr.detectChanges();
    });
  }

  cargarReporte() {
    this.cargando = true;
    this.tareasService.getReporteSemana().subscribe({
      next: (res: any) => {
        this.totalTareas = res.total_tareas || 0;
        this.completadas = res.completadas || 0;
        this.pendientes = res.pendientes || 0;
        this.enProgreso = res.en_progreso || 0;
        this.tiempoTotal = res.tiempo_total || '0 min';
        this.porCategoria = res.por_categoria || [];
        this.porDia = res.por_dia || [];
        this.detalleTareas = res.detalle_tareas_semana || [];
        this.maxMinutosDia = res.max_minutos_dia || 1;
        this.fechaSemana = `${res.inicio_semana} al ${res.fin_semana}`;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notif.error('No se pudo cargar el reporte');
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  getAlturaBarra(minutos: number): string {
    if (this.maxMinutosDia === 0) return '3px';
    const pct = (minutos / this.maxMinutosDia) * 100;
    return pct > 0 ? pct + '%' : '3px';
  }

  getEstadoLabel(estado: string): string {
    const labels: any = { completada: 'Completada', pendiente: ' Pendiente', en_progreso: 'En progreso' };
    return labels[estado] || estado;
  }

  exportar(formato: string) {
    const extension = formato === 'pdf' ? 'pdf' : 'xlsx';
    this.notif.mostrar(`Generando ${formato.toUpperCase()}...`, 'info');

    this.tareasService.exportarReporte(formato).subscribe({
      next: (data: any) => {
        const blob = new Blob([data], {
          type: formato === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_time_planner.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.notif.exito(` ${formato.toUpperCase()} descargado correctamente`);
      },
      error: () => this.notif.error('No se pudo exportar el reporte')
    });
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
}
