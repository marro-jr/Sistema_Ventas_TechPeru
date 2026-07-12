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
/**
 * Componente principal para la gestión de Clientes.
 * Incluye validaciones, rediseño visual y protección de llave foránea.
 */
export class Clientes implements OnInit {
  idClienteEditando: number | null = null;

  nombre = '';
  dni = '';
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
    if (!this.nombre || !this.telefono || !this.direccion || !this.correo) {
      this.mensaje = 'Todos los campos del cliente son obligatorios para guardar.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const cliente = {
      nombre: this.nombre,
      dni: this.dni,
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.idClienteEditando = cliente.id_cliente;
    this.nombre = cliente.nombre;
    this.dni = cliente.dni || '';
    this.telefono = cliente.telefono;
    this.direccion = cliente.direccion;
    this.correo = cliente.correo;
  }

  eliminarFisico(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar FÍSICAMENTE este cliente? Esta acción no se puede deshacer y fallará si el cliente ya está asociado a una venta.')) {
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
  }

  limpiarFormulario(): void {
    this.idClienteEditando = null;
    this.nombre = '';
    this.dni = '';
    this.telefono = '';
    this.direccion = '';
    this.correo = '';
    
    this.cdr.detectChanges();
  }
}