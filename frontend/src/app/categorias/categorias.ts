import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TareasService } from '../services/tareas.service';
import { NotificacionService } from '../services/notificaciones.services'
import { AlertasComponent } from '../shared/alertas/alertas';
import { RecordatoriosService} from '../services/recordatorios.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule,AlertasComponent],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css'
})
export class CategoriasComponent implements OnInit, OnDestroy {
  nombreUsuario: string = '';
  correoUsuario: string = '';
  perfilAbierto: boolean = false;
  @ViewChild('perfilWrap') perfilWrap?: ElementRef;
  menuMovilAbierto: boolean = false;
  modalAbierto: boolean = false;
  modalEditarAbierto: boolean = false;
  categorias: any[] = [];
  forma = { nombre: '' };
  categoriaEditando: any = null;
  formaEditar = { nombre: '' };
  mensajeError: string = '';
  private subPerfil?: Subscription;

  constructor(
    private router: Router,
    private tareasService: TareasService,
    private cdr: ChangeDetectorRef,
    private notif: NotificacionService,
    private recordatoriosService: RecordatoriosService,
  ) {}

  ngOnInit() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  this.nombreUsuario = usuario.nombre_usuario || 'Usuario';
  this.correoUsuario = usuario.correo || '';
  this.cargarCategorias();

  this.subPerfil = this.notif.perfilAbierto$.subscribe(v => {
    this.perfilAbierto = v;
    this.cdr.detectChanges();
  });
}

  cargarCategorias() {
    this.tareasService.getCategorias().subscribe({
      next: (res: any) => {
        this.categorias = res;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error editando categoría:', err)
    });
  }

  // ── CREAR ──
  abrirModal() { this.modalAbierto = true; this.mensajeError = ''; }
  cerrarModal() { this.modalAbierto = false; this.forma = { nombre: '' }; }

guardar() {
  if (!this.forma.nombre.trim()) return;
  this.tareasService.crearCategoria(this.forma.nombre).subscribe({
    next: () => {
      this.forma = { nombre: '' };
      this.modalAbierto = false;
      this.cargarCategorias();
      this.cdr.detectChanges();
    },
    error: (err: any) => console.error('Error creando categoría:', err)
  });
}

  // ── EDITAR ──
  abrirEditar(categoria: any) {
    if (categoria.tipo === 'predeterminada') return;
    this.categoriaEditando = categoria;
    this.formaEditar = { nombre: categoria.nombre };
    this.modalEditarAbierto = true;
    this.mensajeError = '';
  }

  cerrarEditar() {
    this.modalEditarAbierto = false;
    this.categoriaEditando = null;
    this.formaEditar = { nombre: '' };
  }

guardarEdicion() {
  if (!this.formaEditar.nombre.trim()) return;
  this.tareasService.editarCategoria(this.categoriaEditando.id, this.formaEditar.nombre).subscribe({
    next: () => {
      this.modalEditarAbierto = false;
      this.categoriaEditando = null;
      this.formaEditar = { nombre: '' };
      this.cargarCategorias();
      this.cdr.detectChanges();
    },
    error: (err: any) => console.error('Error editando categoría:', err)
  });
}

  // ── ELIMINAR ──
eliminar(categoria: any) {
  if (categoria.tipo === 'predeterminada') return;
  this.notif.confirmar(`¿Eliminar la categoría "${categoria.nombre}"?`, () => {
    this.tareasService.eliminarCategoria(categoria.id).subscribe({
      next: () => {
        this.notif.exito('Categoría eliminada');
        this.cargarCategorias();
      },
      error: (err: any) => {
        const mensaje = err.error?.error || 'No se pudo eliminar la categoría';
        this.notif.error(mensaje);
      }
    });
  });
}

  // ── ÍCONOS por nombre de categoría ──
getIcono(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('trabajo')) return 'trabajo';
    if (n.includes('estudio') || n.includes('escuela')) return 'estudio';
    if (n.includes('salud')) return 'salud';
    if (n.includes('personal')) return 'personal';
    if (n.includes('proyecto')) return 'proyecto';
    if (n.includes('hogar') || n.includes('casa')) return 'hogar';
    if (n.includes('deporte')) return 'deporte';
    if (n.includes('finanza') || n.includes('dinero')) return 'finanza';
    return 'default';
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
    this.subPerfil?.unsubscribe();
  }
}