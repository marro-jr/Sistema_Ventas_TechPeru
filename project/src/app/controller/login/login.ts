/**
 * @module Login
 * @description Componente principal para el inicio de sesión del sistema.
 * Gestiona la autenticación, roles de usuario, manejo de estados de carga y errores.
 * Refactorizado para incluir validación estricta y mejoras visuales (Glassmorphism).
 */
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoginService } from '../../services/login-service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  correo: string = '';
  contrasena: string = '';
  cargando: boolean = false;
  mensajeError: string | null = null;
  contrasenaVisible: boolean = false;

  constructor(
    private loginService: LoginService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  togglePasswordVisibility() {
    this.contrasenaVisible = !this.contrasenaVisible;
  }

  iniciarSesion() {
    this.mensajeError = null;

    if (!this.correo || !this.contrasena) {
      this.mensajeError = 'Por favor, ingresa el correo y la contraseña.';
      return;
    }

    this.cargando = true;

    this.loginService.obtenerCredenciales(this.correo, this.contrasena).subscribe({
      next: (data) => {
        this.cargando = false;
        if (data.success && data.usuario) {
          const usuario = data.usuario;

          if (!usuario.rol) {
            this.mensajeError = 'El usuario existe, pero no tiene rol asignado.';
            this.cdr.detectChanges();
            return;
          }

          localStorage.setItem('id_usuario', usuario.id_usuario);
          localStorage.setItem('correo', usuario.correo);
          localStorage.setItem('nombre', usuario.nombre);
          localStorage.setItem('rol', usuario.rol);

          this.router.navigate(['/inicio']);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error al iniciar sesión:', err);
        if (err.status === 401) {
          this.mensajeError = 'Correo o contraseña incorrectos, o usuario inactivo.';
        } else {
          this.mensajeError = 'Ocurrió un error al iniciar sesión. Por favor, inténtalo más tarde.';
        }
        this.cdr.detectChanges();
      },
    });
  }
}
