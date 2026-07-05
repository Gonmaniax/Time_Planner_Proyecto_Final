import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class RegistroComponent {
  nombre: string = '';
  correo: string = '';
  contrasena: string = '';
  confirmar: string = '';
  errorMsg: string = '';
  successMsg: string = '';
  cargando: boolean = false;

  constructor(private router: Router, private authService: AuthService) {}

  registrar() {
    this.errorMsg = '';
    if (!this.nombre || !this.correo || !this.contrasena) {
      this.errorMsg = 'Todos los campos son obligatorios';
      return;
    }
    if (this.contrasena !== this.confirmar) {
      this.errorMsg = 'Las contraseñas no coinciden';
      return;
    }
    this.cargando = true;
    this.authService.registro(this.nombre, this.correo, this.contrasena).subscribe({
      next: () => {
        this.cargando = false;
        this.successMsg = '¡Cuenta creada! Redirigiendo...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.cargando = false;
        this.errorMsg = err.error?.error || 'Error al crear la cuenta';
      }
    });
  }

  irALogin() {
    this.router.navigate(['/login']);
  }
}