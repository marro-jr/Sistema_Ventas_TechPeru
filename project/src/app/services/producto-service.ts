import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProductoService {

  apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  obtenerProductos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/productos`);
  }

  obtenerProductosInventario(): Observable<any> {
    return this.http.get(`${this.apiUrl}/productos-inventario`);
  }

  registrarProducto(producto: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/productos`, producto);
  }

  modificarProducto(id: number, producto: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/productos/${id}`, producto);
  }

  eliminarLogico(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/productos/${id}/eliminar-logico`, {});
  }

  eliminarFisico(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/productos/${id}`);
  }
}