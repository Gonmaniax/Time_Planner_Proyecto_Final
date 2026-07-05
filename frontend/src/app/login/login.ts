import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { RecordatoriosService } from '../services/recordatorios.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  providers: [AuthService]
})
export class LoginComponent {
  correo: string = '';
  contrasena: string = '';
  errorMsg: string = '';
  cargando: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private recordatoriosService: RecordatoriosService,
    private cdr: ChangeDetectorRef
  ) {}

  iniciarSesion() {
    this.errorMsg = '';
    this.cargando = true;

    this.authService.login(this.correo, this.contrasena).subscribe({
      next: (res: any) => {
        this.cargando = false;
        localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', JSON.stringify(res.usuario));

        if (res.usuario?.rol === 'admin') {
          this.router.navigate(['/admin']);
          return;
        }

        this.recordatoriosService.iniciarPolling();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.cargando = false;
        this.errorMsg = err?.error?.error || 'Correo o contraseña incorrectos';
        Promise.resolve().then(() => this.cdr.detectChanges());
      }
    });
  }

  irARegistro() {
    this.router.navigate(['/registro']);
  }
  irARecuperar() {
    this.router.navigate(['/recuperar']);
  }
}