import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';


@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(correo: string, password: string) {
    return this.http.post(`${this.API}/auth/login`, { correo, password });
  }

  registro(nombre_usuario: string, correo: string, password: string) {
    return this.http.post(`${this.API}/auth/registro`, { nombre: nombre_usuario, correo, password });
  }

  perfil() {
    return this.http.get(`${this.API}/auth/perfil`, { headers: this.getHeaders() });
  }

  getToken(): string {
    return localStorage.getItem('token') || '';
  }

  getHeaders(): HttpHeaders {
    return new HttpHeaders({
    'Authorization': `Bearer ${this.getToken()}`
  });
}

  cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
