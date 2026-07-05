import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NotificacionService } from '../services/notificaciones.services';
import { AlertasComponent } from '../shared/alertas/alertas';
import { Subscription, forkJoin } from 'rxjs';
import { environment } from '../environments/environment';
import { RecordatoriosService} from '../services/recordatorios.service';

interface UsuarioAdmin {
  id: number;
  nombre_usuario: string;
  correo: string;
  rol: string;
  activo: boolean;
  fecha_creacion: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertasComponent],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminComponent implements OnInit, OnDestroy {

  nombreUsuario = '';
  correoUsuario = '';
  perfilAbierto = false;
  @ViewChild('perfilWrap') perfilWrap?: ElementRef;
  private subPerfil?: Subscription;

  usuarios: UsuarioAdmin[] = [];
  cargando = true;
  miId: number | null = null;

  // Filtros del panel
  textoBusqueda = '';
  filtroRol: 'todos' | 'usuario' | 'admin' = 'todos';
  filtroEstado: 'todos' | 'activo' | 'suspendido' = 'todos';

  // Selección múltiple para borrado en lote
  seleccionados = new Set<number>();

  private readonly API = `${environment.apiUrl}/admin/usuarios`;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private notif: NotificacionService,
    private recordatoriosService: RecordatoriosService
  ) {}

  ngOnInit() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    this.nombreUsuario = usuario.nombre_usuario || 'Usuario';
    this.correoUsuario = usuario.correo || '';
    this.miId = usuario.id || null;

    this.subPerfil = this.notif.perfilAbierto$.subscribe(v => {
      this.perfilAbierto = v;
      this.cdr.detectChanges();
    });

    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.cargando = true;
    this.http.get<UsuarioAdmin[]>(this.API).subscribe({
      next: (res) => {
        this.usuarios = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notif.error('No se pudo cargar la lista de usuarios');
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- Estadísticas para las tarjetas de resumen ---
  get totalUsuarios(): number {
    return this.usuarios.length;
  }
  get totalActivos(): number {
    return this.usuarios.filter(u => u.activo).length;
  }
  get totalSuspendidos(): number {
    return this.usuarios.filter(u => !u.activo).length;
  }
  get totalAdmins(): number {
    return this.usuarios.filter(u => u.rol === 'admin').length;
  }

  // --- Filtros ---
  get usuariosFiltrados(): UsuarioAdmin[] {
    const texto = this.textoBusqueda.trim().toLowerCase();
    return this.usuarios.filter(u => {
      const coincideTexto = !texto
        || u.nombre_usuario.toLowerCase().includes(texto)
        || u.correo.toLowerCase().includes(texto);

      const coincideRol = this.filtroRol === 'todos' || u.rol === this.filtroRol;

      const coincideEstado =
        this.filtroEstado === 'todos' ||
        (this.filtroEstado === 'activo' && u.activo) ||
        (this.filtroEstado === 'suspendido' && !u.activo);

      return coincideTexto && coincideRol && coincideEstado;
    });
  }

  limpiarFiltros() {
    this.textoBusqueda = '';
    this.filtroRol = 'todos';
    this.filtroEstado = 'todos';
  }

  iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  // --- Selección múltiple ---
  estaSeleccionado(id: number): boolean {
    return this.seleccionados.has(id);
  }

  toggleSeleccion(id: number) {
    if (id === this.miId) return; // no te puedes seleccionar a ti mismo
    if (this.seleccionados.has(id)) {
      this.seleccionados.delete(id);
    } else {
      this.seleccionados.add(id);
    }
  }

  todosSeleccionados(): boolean {
    const seleccionables = this.usuariosFiltrados.filter(u => u.id !== this.miId);
    return seleccionables.length > 0 && seleccionables.every(u => this.seleccionados.has(u.id));
  }

  toggleSeleccionarTodos(event: Event) {
    const marcado = (event.target as HTMLInputElement).checked;
    const seleccionables = this.usuariosFiltrados.filter(u => u.id !== this.miId);
    if (marcado) {
      seleccionables.forEach(u => this.seleccionados.add(u.id));
    } else {
      seleccionables.forEach(u => this.seleccionados.delete(u.id));
    }
  }

  eliminarSeleccionados() {
    const ids = Array.from(this.seleccionados);
    if (ids.length === 0) return;

    this.notif.confirmar(
      `¿Eliminar permanentemente ${ids.length} usuario(s)? Esta acción no se puede deshacer.`,
      () => {
        const peticiones = ids.map(id => this.http.delete(`${this.API}/${id}`));
        forkJoin(peticiones).subscribe({
          next: () => {
            this.usuarios = this.usuarios.filter(u => !this.seleccionados.has(u.id));
            this.notif.exito(`${ids.length} usuario(s) eliminado(s)`);
            this.seleccionados.clear();
            this.cdr.detectChanges();
          },
          error: () => {
            this.notif.error('No se pudieron eliminar todos los usuarios seleccionados. Recargando lista...');
            this.seleccionados.clear();
            this.cargarUsuarios();
          }
        });
      }
    );
  }

  // --- Acciones individuales (se mantienen igual) ---
  toggleEstado(u: UsuarioAdmin) {
    if (u.id === this.miId) {
      this.notif.advertencia('No puedes suspender tu propia cuenta');
      return;
    }
    const accion = u.activo ? 'suspender' : 'activar';
    this.notif.confirmar(`¿Seguro que quieres ${accion} a "${u.nombre_usuario}"?`, () => {
      this.http.put<any>(`${this.API}/${u.id}/estado`, {}).subscribe({
        next: () => {
          u.activo = !u.activo;
          this.notif.exito(`Usuario ${u.activo ? 'activado' : 'suspendido'}`);
          this.cdr.detectChanges();
        },
        error: () => this.notif.error('No se pudo cambiar el estado del usuario')
      });
    });
  }

  eliminarUsuario(u: UsuarioAdmin) {
    if (u.id === this.miId) {
      this.notif.advertencia('No puedes eliminar tu propia cuenta');
      return;
    }
    this.notif.confirmar(`¿Eliminar permanentemente a "${u.nombre_usuario}"? Esta acción no se puede deshacer.`, () => {
      this.http.delete(`${this.API}/${u.id}`).subscribe({
        next: () => {
          this.usuarios = this.usuarios.filter(x => x.id !== u.id);
          this.seleccionados.delete(u.id);
          this.notif.exito('Usuario eliminado');
          this.cdr.detectChanges();
        },
        error: () => this.notif.error('No se pudo eliminar el usuario')
      });
    });
  }

  togglePerfil() {
    this.notif.cerrarCampana();
    this.notif.togglePerfil();
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
    this.subPerfil?.unsubscribe();
  }
}