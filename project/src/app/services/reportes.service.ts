import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReportesService {
  apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  obtenerEstadisticasVentas(dias?: number): Observable<any> {
    const query = dias ? `?dias=${dias}` : '';
    return this.http.get(`${this.apiUrl}/reportes/ventas-estadisticas${query}`);
  }

  obtenerIngresos(dias?: number): Observable<any> {
    const query = dias ? `?dias=${dias}` : '';
    return this.http.get(`${this.apiUrl}/reportes/ingresos${query}`);
  }

  obtenerEliminaciones(dias?: number): Observable<any> {
    const query = dias ? `?dias=${dias}` : '';
    return this.http.get(`${this.apiUrl}/reportes/eliminaciones${query}`);
  }
}
