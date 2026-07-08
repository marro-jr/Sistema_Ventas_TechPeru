import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoginService } from '../../services/login-service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  correo: string = '';
  contrasena: string = '';

  constructor(
    private loginService: LoginService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  iniciarSesion() {
    if (!this.correo || !this.contrasena) {
      alert('Por favor, ingresa el correo y la contraseña.');
      return;
    }

    this.loginService.obtenerCredenciales(this.correo, this.contrasena).subscribe({
      next: (data) => {
        if (data.success && data.usuario) {
          const usuario = data.usuario;

          if (!usuario.rol) {
            alert('El usuario existe, pero no tiene rol asignado');
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
        console.error('Error al iniciar sesión:', err);
        if (err.status === 401) {
          alert('Correo o contraseña incorrectos, o usuario inactivo');
        } else {
          alert('Ocurrió un error al iniciar sesión. Por favor, inténtalo de nuevo más tarde.');
        }
        this.cdr.detectChanges();
      },
    });
  }
}
