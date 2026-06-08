import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientesService } from '../../services/clientes-service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
})
export class Clientes implements OnInit {
  idClienteEditando: number | null = null;

  nombre = '';
  telefono = '';
  direccion = '';
  correo = '';

  clientes: any[] = [];
  clientesVentas: any[] = [];

  mensaje = '';

  rol: string = '';

  constructor(
    private clientesService: ClientesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
  this.rol = localStorage.getItem('rol') || '';

  this.cargarClientes();
  this.cargarClientesVentas();
}

  guardar(): void {
    const cliente = {
      nombre: this.nombre,
      telefono: this.telefono,
      direccion: this.direccion,
      correo: this.correo,
    };

    if (this.idClienteEditando) {
      this.clientesService.modificarCliente(this.idClienteEditando, cliente).subscribe({
        next: (res) => {
          this.mensaje = res.message;
          this.limpiarFormulario();
          this.cargarClientes();
          this.cargarClientesVentas();
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al modificar cliente';
          this.cdr.detectChanges();
        },
      });
    } else {
      this.clientesService.registrarCliente(cliente).subscribe({
        next: (res) => {
          this.mensaje = res.message;
          this.limpiarFormulario();
          this.cargarClientes();
          this.cargarClientesVentas();
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al registrar cliente';
          this.cdr.detectChanges();
        },
      });
    }
  }

  cargarClientes(): void {
    this.clientesService.obtenerClientes().subscribe({
      next: (data) => {
        this.clientes = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar clientes:', err),
    });
  }

  cargarClientesVentas(): void {
    this.clientesService.obtenerClientesVentas().subscribe({
      next: (data) => {
        this.clientesVentas = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar clientes con ventas:', err),
    });
  }

  editar(cliente: any): void {
    this.idClienteEditando = cliente.id_cliente;
    this.nombre = cliente.nombre;
    this.telefono = cliente.telefono;
    this.direccion = cliente.direccion;
    this.correo = cliente.correo;
  }

  eliminarFisico(id: number): void {
    this.clientesService.eliminarFisico(id).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargarClientes();
        this.cargarClientesVentas();
      },
      error: (err) => {
        this.mensaje = err.error?.error || 'Error al eliminar cliente';
        this.cdr.detectChanges();
      },
    });
  }

  limpiarFormulario(): void {
    this.idClienteEditando = null;
    this.nombre = '';
    this.telefono = '';
    this.direccion = '';
    this.correo = '';
    this.cdr.detectChanges();
  }
}