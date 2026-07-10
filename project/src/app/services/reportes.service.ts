import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReportesService {
  apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  obtenerAnaliticoVentas(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let query = '';

    if (fechaInicio && fechaFin) {
      query = `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
    }

    return this.http.get(`${this.apiUrl}/reportes/ventas-analitico${query}`);
  }

  obtenerEliminaciones(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let query = '';

    if (fechaInicio && fechaFin) {
      query = `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
    }

    return this.http.get(`${this.apiUrl}/reportes/eliminaciones${query}`);
  }

  // NUEVO: Reporte de ventas por fechas
  obtenerVentasPorFechas(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let query = '';

    if (fechaInicio && fechaFin) {
      query = `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
    }

    return this.http.get(`${this.apiUrl}/reportes/ventas-por-fechas${query}`);
  }

  // NUEVO: Reporte de indicadores de ventas
  obtenerIndicadoresVentas(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let query = '';

    if (fechaInicio && fechaFin) {
      query = `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
    }

    return this.http.get(`${this.apiUrl}/reportes/indicadores-ventas${query}`);
  }

  // Este método lo puedes dejar por si acaso, pero ya no lo usaremos en pantalla
  obtenerVentasInventarioIndicadores(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let query = '';

    if (fechaInicio && fechaFin) {
      query = `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
    }

    return this.http.get(`${this.apiUrl}/reportes/ventas-inventario-indicadores${query}`);
  }
}