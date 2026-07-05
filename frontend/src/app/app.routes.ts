import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { RegistroComponent } from './registro/registro';
import { DashboardComponent } from './dashboard/dashboard';
import { TareasComponent } from './tareas/tareas';
import { CronometroComponent } from './cronometro/cronometro';
import { RecordatoriosComponent } from './recordatorios/recordatorios';
import { CategoriasComponent } from './categorias/categorias';
import { ReportesComponent } from './reportes/reportes';
import { Perfil } from './perfil/perfil';
import { AdminComponent } from './admin/admin';
import { adminGuard } from './guards/admin.guard';
import { bloquearAdminGuard } from './guards/bloquear-admin.guard';
import { RecuperarComponent } from './recuperar/recuperar';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'recuperar', component: RecuperarComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [bloquearAdminGuard] },
  { path: 'tareas', component: TareasComponent, canActivate: [bloquearAdminGuard] },
  { path: 'cronometro', component: CronometroComponent, canActivate: [bloquearAdminGuard] },
  { path: 'recordatorios', component: RecordatoriosComponent, canActivate: [bloquearAdminGuard] },
  { path: 'categorias', component: CategoriasComponent, canActivate: [bloquearAdminGuard] },
  { path: 'reportes', component: ReportesComponent, canActivate: [bloquearAdminGuard] },
  { path: 'perfil', component: Perfil, canActivate: [bloquearAdminGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: 'login' }
];