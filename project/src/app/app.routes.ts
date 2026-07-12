import { Routes } from '@angular/router';
import { Registro } from './controller/registro/registro';
import { Login } from './controller/login/login';
import { Mantenimiento } from './controller/mantenimiento/mantenimiento';
import { Ventas } from './controller/ventas/ventas';
import { Clientes } from './controller/clientes/clientes';
import { Inicio } from './controller/inicio/inicio';
import { Reportes } from './controller/reportes/reportes';

export const routes: Routes = [
 { path: '', redirectTo: 'login', pathMatch: 'full' },
{ path: 'login', component: Login },
{ path: 'inicio', component: Inicio },
{ path: 'registro', component: Registro },
{ path: 'mantenimiento', component: Mantenimiento },
{ path: 'clientes', component: Clientes },
{ path: 'ventas', component: Ventas },
{ path: 'reportes', component: Reportes }
];
