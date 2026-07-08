import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
// Servicio para las peticiones de Registro
export class RegistroService {

  apiUrl = 'http://localhost:3000/registro';

  constructor(private http: HttpClient) {}

  insertarUsuario(correo: string, nombre: string, contrasena: string, estado: string): Observable<any> {
    const usuario = {
      correo: correo,
      nombre: nombre,
      contrasena: contrasena,
      estado: estado,
    };

    return this.http.post(this.apiUrl, usuario);
  }

  obtenerUsuarios(): Observable<any> {
    return this.http.get('http://localhost:3000/usuarios');
  }

  asignarRol(rol: string, id_usuario: number, turno: string, area: string): Observable<any> {
    const rolData = {
      id_usuario: id_usuario,
      turno: turno,
      area: area,
    };

    return this.http.post(`${this.apiUrl}/${rol}`, rolData);
  }

  obtenerPorRol(rol: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${rol}`);
  }

  modificarUsuario(id_usuario: number, nombre: string, estado: string): Observable<any> {
    const usuario = {
      nombre: nombre,
      estado: estado,
    };

    return this.http.put(`http://localhost:3000/usuarios/${id_usuario}`, usuario);
  }

  eliminarUsuario(id_usuario: number): Observable<any> {
    return this.http.delete(`http://localhost:3000/usuarios/${id_usuario}`);
  }

  modificarRol(rol: string, id_usuario: number, turno: string, area: string): Observable<any> {
    const rolData = {
      turno: turno,
      area: area,
    };

    return this.http.put(`${this.apiUrl}/${rol}/${id_usuario}`, rolData);
  }
}