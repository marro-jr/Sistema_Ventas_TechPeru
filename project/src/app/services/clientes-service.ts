import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ClientesService {
  apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  obtenerClientes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/clientes`);
  }

  obtenerClientesVentas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/clientes-ventas`);
  }

  registrarCliente(cliente: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/clientes`, cliente);
  }

  modificarCliente(id: number, cliente: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/clientes/${id}`, cliente);
  }

  eliminarFisico(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/clientes/${id}`);
  }
}