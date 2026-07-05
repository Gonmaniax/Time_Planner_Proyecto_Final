import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NotificacionService } from '../services/notificaciones.services';
import { AlertasComponent } from '../shared/alertas/alertas';
import { Subscription } from 'rxjs';
import { environment } from '../environments/environment';
import { RecordatoriosService} from '../services/recordatorios.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertasComponent],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit, OnDestroy {

  nombreUsuario = '';
  correoUsuario = '';
  perfilAbierto = false;
  @ViewChild('perfilWrap') perfilWrap?: ElementRef;
  private subPerfil?: Subscription;

  forma = { nombre_usuario: '', correo: '' };
  formaClave = { actual: '', nueva: '', confirmar: '' };
  guardandoDatos = false;
  guardandoClave = false;

  private readonly API = `${environment.apiUrl}/perfil`;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private notif: NotificacionService,
    private zone: NgZone,
    private recordatoriosService: RecordatoriosService
  ) {}

  ngOnInit() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    this.nombreUsuario = usuario.nombre_usuario || 'Usuario';
    this.correoUsuario = usuario.correo || '';
    this.forma.nombre_usuario = this.nombreUsuario;
    this.forma.correo = this.correoUsuario;

    this.subPerfil = this.notif.perfilAbierto$.subscribe(v => {
      this.perfilAbierto = v;
      this.cdr.detectChanges();
    });
  }

  guardarDatos() {
    if (!this.forma.nombre_usuario || !this.forma.correo) {
      this.notif.advertencia('Nombre y correo son obligatorios');
      return;
    }
    this.guardandoDatos = true;
    this.http.put(this.API, this.forma).subscribe({
      next: () => {
        this.zone.run(() => {
          const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
          usuario.nombre_usuario = this.forma.nombre_usuario;
          usuario.correo = this.forma.correo;
          localStorage.setItem('usuario', JSON.stringify(usuario));
          this.nombreUsuario = this.forma.nombre_usuario;
          this.correoUsuario = this.forma.correo;
          this.guardandoDatos = false;
          this.notif.exito('Perfil actualizado correctamente');
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.zone.run(() => {
          this.guardandoDatos = false;
          this.notif.error(err?.error?.error || 'No se pudo actualizar el perfil');
          this.cdr.detectChanges();
        });
      }
    });
  }

  cambiarClave() {
    if (!this.formaClave.actual || !this.formaClave.nueva || !this.formaClave.confirmar) {
      this.notif.advertencia('Completa los tres campos de contraseña');
      return;
    }
    if (this.formaClave.nueva !== this.formaClave.confirmar) {
      this.notif.advertencia('Las contraseñas nuevas no coinciden');
      return;
    }
    if (this.formaClave.nueva.length < 6) {
      this.notif.advertencia('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    this.guardandoClave = true;
    this.http.put(`${this.API}/contrasena`, {
      actual: this.formaClave.actual,
      nueva: this.formaClave.nueva
    }).subscribe({
      next: () => {
        this.guardandoClave = false;
        this.formaClave = { actual: '', nueva: '', confirmar: '' };
        this.notif.exito('Contraseña actualizada correctamente');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.guardandoClave = false;
        this.notif.error(err?.error?.error || 'No se pudo cambiar la contraseña');
        this.cdr.detectChanges();
      }
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

  irA(ruta: string) { this.router.navigate(['/' + ruta]); }

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