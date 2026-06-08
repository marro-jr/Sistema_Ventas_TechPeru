import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoginService {

  apiUrl = 'http://localhost:3000/login';

  constructor(private http: HttpClient) {}

  obtenerCredenciales(correo: string, contrasena: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${correo}/${contrasena}`);
  }
}