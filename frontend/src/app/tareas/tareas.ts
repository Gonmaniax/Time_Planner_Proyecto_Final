import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, ChangeDetectionStrategy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TareasService } from '../services/tareas.service';
import { CronometroService } from '../services/cronometro.service';
import { NotificacionService } from '../services/notificaciones.services';
import { AlertasComponent } from '../shared/alertas/alertas';
import { Subscription } from 'rxjs';
import { RecordatoriosService} from '../services/recordatorios.service';
interface Tarea {
  id: number;
  titulo: string;
  id_categoria: number;
  categoria_nombre: string;
  tiempo_estimado_min: number;
  prioridad: string;
  estado: string;
  fecha_limite: string;
  descripcion: string;
  fecha_creacion: string;
}

interface Categoria {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertasComponent],
  templateUrl: './tareas.html',
  styleUrl: './tareas.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TareasComponent implements OnInit,OnDestroy {

  nombreUsuario: string = '';
  correoUsuario: string = '';
  perfilAbierto: boolean = false;
  menuMovilAbierto: boolean = false;
  private subPerfil?: Subscription;
  @ViewChild('perfilWrap') perfilWrap?: ElementRef;
  tareas: Tarea[] = [];
  categorias: Categoria[] = [];
  modalAbierto: boolean = false;
  tareaEditando: Tarea | null = null;
  filtroActivo: string = 'Todas';
  filtros: string[] = ['Todas', 'pendiente', 'completada'];

  filtroCategoria: number = 0;
  filtroPrioridad: string = '';
  filtroSoloHoy: boolean = false;
  seleccionadas: Set<number> = new Set();
  ordenColumna: string = '';
  ordenAsc: boolean = true;

  tiempoPersonalizado: boolean = false;
  tiempoCustomValor: number = 0;
  tiempoCustomUnidad: string = 'min';
  intentoGuardar: boolean = false;


  tiempoOpciones = [
    { label: '15 min', valor: 15 },
    { label: '30 min', valor: 30 },
    { label: '45 min', valor: 45 },
    { label: '1 hora', valor: 60 },
    { label: '1h 30', valor: 90 },
    { label: '2 horas', valor: 120 },
  ];

  forma = {
    titulo: '',
    descripcion: '',
    id_categoria: 0,
    prioridad: 'media',
    tiempo_estimado_min: 0,
    fecha_limite: ''
  };

  constructor(
    private router: Router,
    private tareasService: TareasService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private cronometroService: CronometroService,
    private notif: NotificacionService,
    private recordatoriosService: RecordatoriosService
  ) {}

  ngOnInit() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    this.nombreUsuario = usuario.nombre_usuario || 'Usuario';
    this.correoUsuario = usuario.correo || '';
    this.cargarTareas();
    this.cargarCategorias();

    this.subPerfil = this.notif.perfilAbierto$.subscribe(v => {
      this.perfilAbierto = v;
      this.cdr.detectChanges();
    });
  }

  cargarTareas() {
    this.tareasService.getTareas().subscribe({
      next: (res: any) => { this.tareas = res; this.cdr.detectChanges(); },
      error: (err: any) => console.error('Error cargando tareas:', err)
    });
  }

  cargarCategorias() {
    this.tareasService.getCategorias().subscribe({
      next: (res: any) => { this.categorias = res; this.cdr.detectChanges(); },
      error: (err: any) => console.error('Error cargando categorias:', err)
    });
  }

  tareasFiltradas(): Tarea[] {
  let lista = this.tareas;

  if (this.filtroActivo !== 'Todas')
    lista = lista.filter(t => t.estado === this.filtroActivo);

  if (this.filtroCategoria)
    lista = lista.filter(t => t.id_categoria === Number(this.filtroCategoria));

  if (this.filtroPrioridad)
    lista = lista.filter(t => t.prioridad === this.filtroPrioridad);

  if (this.filtroSoloHoy) {
    const hoyStr = new Date().toISOString().split('T')[0];
    lista = lista.filter(t => t.fecha_limite && t.fecha_limite.split('T')[0] === hoyStr);
  }

  if (this.ordenColumna) {
    lista = [...lista].sort((a: any, b: any) => {
      const va = a[this.ordenColumna] ?? '';
      const vb = b[this.ordenColumna] ?? '';
      return this.ordenAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  } else {
    // Orden por defecto: más recientes primero
    lista = [...lista].sort((a, b) =>
      new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
    );
  }

  return lista;
}
  ordenarPor(col: string) {
    if (this.ordenColumna === col) {
      this.ordenAsc = !this.ordenAsc;
    } else {
      this.ordenColumna = col;
      this.ordenAsc = true;
    }
    this.cdr.detectChanges();
  }

  get hayFiltrosActivos(): boolean {
  return this.filtroActivo !== 'Todas' || this.filtroCategoria !== 0 || this.filtroPrioridad !== '' || this.filtroSoloHoy;
}

limpiarFiltros() {
  this.filtroActivo = 'Todas';
  this.filtroCategoria = 0;
  this.filtroPrioridad = '';
  this.filtroSoloHoy = false;
  this.cdr.detectChanges();
}

  toggleSeleccion(id: number) {
    if (this.seleccionadas.has(id)) {
      this.seleccionadas.delete(id);
    } else {
      this.seleccionadas.add(id);
    }
    this.cdr.detectChanges();
  }

  toggleTodas() {
    const lista = this.tareasFiltradas();
    if (this.seleccionadas.size === lista.length) {
      this.seleccionadas.clear();
    } else {
      lista.forEach(t => this.seleccionadas.add(t.id));
    }
    this.cdr.detectChanges();
  }

  todasSeleccionadas(): boolean {
    const lista = this.tareasFiltradas();
    return lista.length > 0 && this.seleccionadas.size === lista.length;
  }

  borrarSeleccionadas() {
    if (this.seleccionadas.size === 0) return;
    const tareaEnCronometro = this.cronometroService.getEstado().tareaActiva;
    if (tareaEnCronometro && this.seleccionadas.has(tareaEnCronometro.id)) {
      this.notif.advertencia('Una de las tareas seleccionadas está siendo cronometrada.');
      return;
    }
    this.notif.confirmar(
      `¿Borrar ${this.seleccionadas.size} tarea(s) seleccionada(s)?`,
      () => {
        const ids = Array.from(this.seleccionadas);
        const peticiones = ids.map(id => this.tareasService.eliminarTarea(id));
        let completadasCount = 0;
        peticiones.forEach(p => p.subscribe({
          next: () => {
            completadasCount++;
            if (completadasCount === ids.length) {
              this.seleccionadas.clear();
              this.notif.exito(`${ids.length} tarea(s) eliminada(s)`);
              this.cargarTareas();
            }
          },
          error: () => this.notif.error('No se pudo eliminar alguna tarea')
        }));
      }
    );
  }

  marcarCompletada(tarea: Tarea) {
    const tareaEnCronometro = this.cronometroService.getEstado().tareaActiva;
    if (tareaEnCronometro && tareaEnCronometro.id === tarea.id) {
      this.notif.advertencia('Esta tarea está siendo cronometrada. Detén el cronómetro primero.');
      return;
    }
    this.notif.confirmar(`¿Marcar "${tarea.titulo}" como completada?`, () => {
      this.tareasService.actualizarTarea(tarea.id, { estado: 'completada' }).subscribe({
        next: () => {
          this.tareasService.crearSesion({
            id_tarea: tarea.id,
            inicio: new Date().toISOString(),
            fin: new Date().toISOString(),
            duracion_min: 0,
            resultado: 'completada_manual'
          }).subscribe();
          this.notif.exito(`"${tarea.titulo}" marcada como completada`);
          this.cargarTareas();
        },
        error: () => this.notif.error('No se pudo actualizar la tarea')
      });
    });
  }

  seleccionarTiempo(valor: number) {
    this.forma.tiempo_estimado_min = valor;
    this.tiempoPersonalizado = false;
    this.cdr.detectChanges();
  }

  activarTiempoPersonalizado() {
    this.tiempoPersonalizado = true;
    this.tiempoCustomValor = 0;
    this.tiempoCustomUnidad = 'min';
    this.cdr.detectChanges();
  }

  actualizarTiempoCustom() {
    if (this.tiempoCustomUnidad === 'hora') {
      this.forma.tiempo_estimado_min = this.tiempoCustomValor * 60;
    } else {
      this.forma.tiempo_estimado_min = this.tiempoCustomValor;
    }
    this.cdr.detectChanges();
  }

  formatTiempo(min: number): string {
    if (!min || min === 0) return '—';
    if (min < 60) return `${min} min`;
    const horas = Math.floor(min / 60);
    const minutos = min % 60;
    return minutos > 0 ? `${horas}h ${minutos}min` : `${horas}h`;
  }

  getFechaTexto(fecha: string): string {
    if (!fecha) return '—';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(fecha + 'T12:00:00');
    limite.setHours(0, 0, 0, 0);
    const diff = Math.round((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Vencida';
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Mañana';
    if (diff <= 7) return `En ${diff} días`;
    return limite.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }

  getFechaClase(fecha: string): string {
    if (!fecha) return '';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(fecha + 'T12:00:00');
    limite.setHours(0, 0, 0, 0);
    const diff = Math.round((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'fecha-vencida';
    if (diff === 0) return 'fecha-hoy';
    if (diff === 1) return 'fecha-manana';
    if (diff <= 7) return 'fecha-pronto';
    return 'fecha-normal';
  }

  abrirModal() {
    this.tareaEditando = null;
    this.tiempoPersonalizado = false;
    this.tiempoCustomValor = 0;
    this.forma = {
      titulo: '',
      descripcion: '',
      id_categoria: this.categorias.length > 0 ? this.categorias[0].id : 0,
      prioridad: 'media',
      tiempo_estimado_min: 0,
      fecha_limite: ''
    };
    this.modalAbierto = true;
    this.cdr.detectChanges();
  }

  editarTarea(tarea: Tarea) {
    const tareaEnCronometro = this.cronometroService.getEstado().tareaActiva;
    if (tareaEnCronometro && tareaEnCronometro.id === tarea.id) {
      this.notif.advertencia('No puedes editar una tarea que está siendo cronometrada.');
      return;
    }
    this.tareaEditando = tarea;
    this.tiempoPersonalizado = false;
    this.forma = {
      titulo: tarea.titulo,
      descripcion: tarea.descripcion,
      id_categoria: tarea.id_categoria,
      prioridad: tarea.prioridad,
      tiempo_estimado_min: tarea.tiempo_estimado_min,
      fecha_limite: tarea.fecha_limite ? tarea.fecha_limite.split('T')[0] : ''
    };
    this.modalAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.tareaEditando = null;
    this.tiempoPersonalizado = false;
    this.intentoGuardar = false;
    this.cdr.detectChanges();
  }

  guardarTarea() {
    this.intentoGuardar = true;
    this.cdr.detectChanges();
    if (!this.forma.titulo) {
      this.notif.advertencia('El nombre de la tarea es obligatorio');
      return;
    }
    if (!this.forma.tiempo_estimado_min || this.forma.tiempo_estimado_min <= 0) {
      this.notif.advertencia('Debes asignar un tiempo estimado a la tarea');
      return;
    }
    if (!this.forma.fecha_limite) {                              
    this.notif.advertencia('Debes asignar una fecha límite a la tarea');
    return;
    }
    const datos = {
      titulo: this.forma.titulo,
      descripcion: this.forma.descripcion,
      id_categoria: Number(this.forma.id_categoria),
      prioridad: this.forma.prioridad.toLowerCase(),
      tiempo_estimado_min: Number(this.forma.tiempo_estimado_min),
      fecha_limite: this.forma.fecha_limite || null
    };

    const accion = this.tareaEditando
      ? this.tareasService.actualizarTarea(this.tareaEditando.id, datos)
      : this.tareasService.crearTarea(datos);

    accion.subscribe({
      next: () => {
        this.zone.run(() => {
          this.notif.exito(this.tareaEditando ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente');
          this.modalAbierto = false;
          this.tareaEditando = null;
          this.tiempoPersonalizado = false;
          this.intentoGuardar = false;
          this.cdr.detectChanges();

          this.tareasService.getTareas().subscribe({
            next: (res: any) => {
              this.tareas = res;
              this.cdr.detectChanges();
            }
          });
        });
      },
      error: (err: any) => {
        this.notif.error('No se pudo guardar la tarea');
        console.error('Error guardando:', err);
      }
    });
  }

  eliminarTarea(id: number) {
    const tareaEnCronometro = this.cronometroService.getEstado().tareaActiva;
    if (tareaEnCronometro && tareaEnCronometro.id === id) {
      this.notif.advertencia('No puedes eliminar una tarea que está siendo cronometrada.');
      return;
    }
    this.notif.confirmar('¿Seguro que quieres eliminar esta tarea?', () => {
      this.tareasService.eliminarTarea(id).subscribe({
        next: () => {
          this.notif.exito('Tarea eliminada correctamente');
          this.cargarTareas();
        },
        error: () => this.notif.error('No se pudo eliminar la tarea')
      });
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