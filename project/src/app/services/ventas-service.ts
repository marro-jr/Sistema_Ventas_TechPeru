import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
// Servicio para las peticiones de Ventas
export class VentasService {
  apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  obtenerClientes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/clientes`);
  }

  obtenerVendedores(): Observable<any> {
    return this.http.get(`${this.apiUrl}/vendedores`);
  }

  obtenerProductosInventario(): Observable<any> {
    return this.http.get(`${this.apiUrl}/productos-inventario`);
  }

  obtenerVentas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ventas`);
  }

  obtenerVentasDetalle(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ventas-detalle`);
  }

  obtenerRecibo(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/ventas/${id}/recibo`);
  }

  registrarVenta(venta: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ventas`, venta);
  }

  modificarVenta(id: number, venta: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/ventas/${id}`, venta);
  }



  eliminarLogico(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/ventas/${id}/eliminar-logico`, {});
  }

  eliminarFisico(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ventas/${id}`);
  }
}