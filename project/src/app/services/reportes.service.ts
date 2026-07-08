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
}
