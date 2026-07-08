/**
 * @module Registro
 * @description Componente para el registro de usuarios y asignación de roles.
 * Integrado en una sola vista para mejorar la experiencia de usuario (UX).
 * Incluye validaciones robustas con expresiones regulares para contraseñas seguras.
 */
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RegistroService } from '../../services/registro-service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
// Controlador para el Registro de usuarios
export class Registro implements OnInit {
  correo: string = '';
  nombre: string = '';
  contrasena: string = '';
  estado: string = 'Activo';

  rolSeleccionado: string = 'administrador';
  usuarioSeleccionado: number | null = null;
  turno: string = 'mañana';

  usuarios: any[] = [];
  administradores: any[] = [];
  vendedores: any[] = [];

  errorCorreo: string = '';
  errorPass: string = '';
  mensaje: string = '';
  ultimoIdRegistrado: number | null = null;

  idUsuarioEditando: number | null = null;
  editandoRol: boolean = false;

  rol: string = '';
  
  constructor(
    private registroService: RegistroService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.rol = localStorage.getItem('rol') || '';

    this.cargarUsuarios();
    this.cargarAdministradores();
    this.cargarVendedores();
  }

  get passwordValidations() {
    return {
      length: this.contrasena.length >= 9,
      upper: /[A-Z]/.test(this.contrasena),
      lower: /[a-z]/.test(this.contrasena),
      number: /\d/.test(this.contrasena),
      special: /[@$!%*?&]/.test(this.contrasena)
    };
  }

  get isPasswordValid() {
    const v = this.passwordValidations;
    return v.length && v.upper && v.lower && v.number && v.special;
  }

  guardar() {
    this.errorCorreo = '';
    this.errorPass = '';

    if (!this.nombre || !this.correo || !this.estado || (!this.idUsuarioEditando && !this.contrasena)) {
      this.mensaje = 'Todos los campos (Nombre, Correo, Estado, Contraseña) son obligatorios para guardar.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (this.idUsuarioEditando) {
      this.modificarUsuario();
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,100}$/;
    
    if (!emailRegex.test(this.correo)) {
      this.errorCorreo = 'Correo inválido';
      return;
    }

    if (!this.isPasswordValid) {
      this.errorPass = 'Contraseña no cumple requisitos de seguridad.';
      return;
    }

    this.registrarUsuario();
  }

  registrarUsuario(): void {
    this.registroService
      .insertarUsuario(this.correo, this.nombre, this.contrasena, this.estado)
      .subscribe({
        next: (res) => {
          this.ultimoIdRegistrado = res.id_usuario;
          
          if (this.rolSeleccionado && this.turno) {
            this.registroService.asignarRol(this.rolSeleccionado, res.id_usuario, this.turno, this.rolSeleccionado)
              .subscribe({
                next: () => {
                  this.mensaje = `Usuario y Rol registrados exitosamente. (ID: ${res.id_usuario})`;
                  this.finalizarRegistro();
                },
                error: (err) => {
                  this.mensaje = `Usuario creado, pero falló la asignación de rol: ${err.error?.error}`;
                  this.finalizarRegistro();
                }
              });
          } else {
            this.mensaje = `Usuario registrado exitosamente. ID: ${res.id_usuario}`;
            this.finalizarRegistro();
          }
        },
        error: (err) => {
          this.mensaje = `Error: ${err.error?.error || 'No se pudo registrar el usuario'}`;
          this.cdr.detectChanges();
        },
      });
  }

  finalizarRegistro() {
    this.correo = '';
    this.nombre = '';
    this.contrasena = '';
    this.estado = 'Activo';
    this.turno = 'mañana';
    this.cargarUsuarios();
    this.cargarAdministradores();
    this.cargarVendedores();
    this.cdr.detectChanges();
  }

  asignarRol(): void {
    if (!this.usuarioSeleccionado) {
      this.mensaje = 'Ingrese el ID del usuario';
      return;
    }

    if (this.editandoRol) {
      this.registroService
        .modificarRol(
          this.rolSeleccionado,
          this.usuarioSeleccionado,
          this.turno,
          this.rolSeleccionado,
        )
        .subscribe({
          next: (res) => {
            this.mensaje = res.message;
            this.cargarAdministradores();
            this.cargarVendedores();
            this.limpiarFormularioRol();
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.mensaje = `Error: ${err.error?.error || 'No se pudo modificar el rol'}`;
            this.cdr.detectChanges();
          },
        });

      return;
    }

    this.registroService
      .asignarRol(this.rolSeleccionado, this.usuarioSeleccionado, this.turno, this.rolSeleccionado)
      .subscribe({
        next: (res) => {
          this.mensaje = res.message;
          this.cargarAdministradores();
          this.cargarVendedores();
          this.limpiarFormularioRol();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.mensaje = `Error: ${err.error?.error || 'No se pudo asignar el rol'}`;
          this.cdr.detectChanges();
        },
      });
  }

  cargarUsuarios(): void {
    this.registroService.obtenerUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar usuarios:', err),
    });
  }

  cargarAdministradores(): void {
    this.registroService.obtenerPorRol('administrador').subscribe({
      next: (data) => {
        this.administradores = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar administradores:', err),
    });
  }

  cargarVendedores(): void {
    this.registroService.obtenerPorRol('vendedor').subscribe({
      next: (data) => {
        this.vendedores = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar vendedores:', err),
    });
  }

  modificarUsuario(): void {
    this.registroService
      .modificarUsuario(this.idUsuarioEditando!, this.nombre, this.estado)
      .subscribe({
        next: (res) => {
          this.mensaje = res.message;
          this.limpiarFormularioUsuario();
          this.cargarUsuarios();
          this.cargarAdministradores();
          this.cargarVendedores();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.mensaje = `Error: ${err.error?.error || 'No se pudo modificar el usuario'}`;
          this.cdr.detectChanges();
        },
      });
  }

  editarUsuario(usuario: any): void {
    this.idUsuarioEditando = usuario.id_usuario;
    this.correo = usuario.correo;
    this.nombre = usuario.nombre;
    this.estado = usuario.estado;
    this.contrasena = '';
  }

  eliminarUsuario(id_usuario: number): void {
    if(!confirm('¿Estás seguro de eliminar físicamente este usuario? Esto no se puede deshacer.')) return;
    this.registroService.eliminarUsuario(id_usuario).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargarUsuarios();
        this.cargarAdministradores();
        this.cargarVendedores();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mensaje = `${err.error?.error || 'No se pudo eliminar el usuario'}`;
        this.cdr.detectChanges();
      },
    });
  }

  limpiarFormularioUsuario(): void {
    this.idUsuarioEditando = null;
    this.correo = '';
    this.nombre = '';
    this.contrasena = '';
    this.estado = 'Activo';
    this.errorCorreo = '';
    this.errorPass = '';
  }

  editarRol(rol: string, usuario: any): void {
    this.editandoRol = true;
    this.rolSeleccionado = rol;
    this.usuarioSeleccionado = usuario.id_usuario;
    this.turno = usuario.turno;
  }

  limpiarFormularioRol(): void {
    this.editandoRol = false;
    this.usuarioSeleccionado = null;
    this.turno = 'mañana';
    this.rolSeleccionado = 'administrador';
  }

  toggleEstado(usuario: any) {
    const estadoActual = (usuario.estado || '').toLowerCase();
    const nuevoEstado = estadoActual === 'activo' ? 'Inactivo' : 'Activo';

    this.registroService.modificarUsuario(
      usuario.id_usuario,
      usuario.nombre,
      nuevoEstado
    ).subscribe({
      next: (res) => {
        usuario.estado = nuevoEstado;
        this.mensaje = res.message;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mensaje = `Error: ${err.error?.error || 'No se pudo cambiar estado'}`;
      }
    });
  }
}
