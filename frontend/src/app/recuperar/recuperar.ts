import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-recuperar',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './recuperar.html',
  styleUrls: ['./recuperar.css', '../login/login.css']
})
export class RecuperarComponent {

  private readonly API = `${environment.apiUrl}/recuperacion`;

  paso: number = 1; // 1 = correo, 2 = código, 3 = nueva contraseña
  correo: string = '';
  codigo: string = '';
  nuevaContrasena: string = '';
  confirmarContrasena: string = '';
  cargando: boolean = false;
  errorMsg: string = '';
  exitoMsg: string = '';

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  async solicitarCodigo() {
    this.errorMsg = '';
    if (!this.correo) {
      this.errorMsg = 'Ingresa tu correo';
      return;
    }
    this.cargando = true;

    try {
      const resp = await fetch(`${this.API}/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: this.correo })
      });

      let data: any = {};
      try { data = await resp.json(); } catch (_) { /* respuesta vacía */ }

      this.cargando = false;

      if (resp.ok) {
        this.paso = 2;
      } else {
        this.errorMsg = data?.error || 'No se pudo enviar el código';
      }
    } catch (err: any) {
      this.cargando = false;
      this.errorMsg = 'Error de conexión: ' + (err?.message || 'desconocido');
    }

    this.cdr.detectChanges();
  }

  async verificarCodigo() {
    this.errorMsg = '';
    if (!this.codigo) {
      this.errorMsg = 'Ingresa el código que recibiste';
      return;
    }
    this.cargando = true;

    try {
      const resp = await fetch(`${this.API}/verificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: this.correo, codigo: this.codigo })
      });

      let data: any = {};
      try { data = await resp.json(); } catch (_) {}

      this.cargando = false;

      if (resp.ok) {
        this.paso = 3;
      } else {
        this.errorMsg = data?.error || 'Código incorrecto';
      }
    } catch (err: any) {
      this.cargando = false;
      this.errorMsg = 'Error de conexión: ' + (err?.message || 'desconocido');
    }

    this.cdr.detectChanges();
  }

  async resetearContrasena() {
    this.errorMsg = '';
    if (!this.nuevaContrasena || !this.confirmarContrasena) {
      this.errorMsg = 'Completa ambos campos de contraseña';
      return;
    }
    if (this.nuevaContrasena !== this.confirmarContrasena) {
      this.errorMsg = 'Las contraseñas no coinciden';
      return;
    }
    if (this.nuevaContrasena.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    this.cargando = true;

    try {
      const resp = await fetch(`${this.API}/resetear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: this.correo,
          codigo: this.codigo,
          nueva: this.nuevaContrasena
        })
      });

      let data: any = {};
      try { data = await resp.json(); } catch (_) {}

      this.cargando = false;

      if (resp.ok) {
        this.exitoMsg = 'Contraseña actualizada. Ya puedes iniciar sesión.';
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/login']), 2000);
        return;
      } else {
        this.errorMsg = data?.error || 'No se pudo actualizar la contraseña';
      }
    } catch (err: any) {
      this.cargando = false;
      this.errorMsg = 'Error de conexión: ' + (err?.message || 'desconocido');
    }

    this.cdr.detectChanges();
  }

  volverALogin() {
    this.router.navigate(['/login']);
  }
}