import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductoService } from '../../services/producto-service';

@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mantenimiento.html',
  styleUrl: './mantenimiento.css',
})
export class Mantenimiento implements OnInit {
  idProductoEditando: number | null = null;

  nombre = '';
  marca = '';
  modelo = '';
  tipo_switch = '';
  tipo_layout = '';
  precio: number | null = null;
  estado = 'Disponible';
  stock_actual: number | null = null;
  stock_minimo: number | null = null;

  productos: any[] = [];
  productosInventario: any[] = [];
  mensaje = '';

  rol: string = '';

  constructor(
    private productoService: ProductoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.rol = localStorage.getItem('rol') || '';

    this.cargarProductos();
    this.cargarProductosInventario();
  }

  guardar(): void {
    const producto = {
      nombre: this.nombre,
      marca: this.marca,
      modelo: this.modelo,
      tipo_switch: this.tipo_switch,
      tipo_layout: this.tipo_layout,
      precio: this.precio,
      estado: this.estado,
      stock_actual: this.stock_actual,
      stock_minimo: this.stock_minimo,
    };

    if (this.idProductoEditando) {
      this.productoService.modificarProducto(this.idProductoEditando, producto).subscribe({
        next: (res) => {
          this.mensaje = res.message;
          this.limpiarFormulario();
          this.cargarProductos();
          this.cargarProductosInventario();
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al modificar producto';
          this.cdr.detectChanges();
        },
      });
    } else {
      this.productoService.registrarProducto(producto).subscribe({
        next: (res) => {
          this.mensaje = res.message;
          this.limpiarFormulario();
          this.cargarProductos();
          this.cargarProductosInventario();
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al registrar producto';
          this.cdr.detectChanges();
        },
      });
    }
  }

  cargarProductos(): void {
    this.productoService.obtenerProductos().subscribe({
      next: (data) => {
        this.productos = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar productos:', err),
    });
  }

  cargarProductosInventario(): void {
    this.productoService.obtenerProductosInventario().subscribe({
      next: (data) => {
        this.productosInventario = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar productos con inventario:', err),
    });
  }

  editar(producto: any): void {
    this.idProductoEditando = producto.id_producto;
    this.nombre = producto.nombre;
    this.marca = producto.marca;
    this.modelo = producto.modelo;
    this.tipo_switch = producto.tipo_switch;
    this.tipo_layout = producto.tipo_layout;
    this.precio = producto.precio;
    this.estado = producto.estado;
    this.stock_actual = producto.stock_actual;
    this.stock_minimo = producto.stock_minimo;
  }

  eliminarLogico(id: number): void {
    this.productoService.eliminarLogico(id).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargarProductos();
        this.cargarProductosInventario();
      },
      error: (err) => {
        this.mensaje = err.error?.error || 'Error al eliminar lógicamente';
        this.cdr.detectChanges();
      },
    });
  }

  eliminarFisico(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar FÍSICAMENTE este producto? Esta acción no se puede deshacer y fallará si el producto ya está asociado a una venta.')) {
      this.productoService.eliminarFisico(id).subscribe({
        next: (res) => {
          this.mensaje = res.message;
          this.cargarProductos();
          this.cargarProductosInventario();
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al eliminar físicamente';
          this.cdr.detectChanges();
        },
      });
    }
  }

  limpiarFormulario(): void {
    this.idProductoEditando = null;
    this.nombre = '';
    this.marca = '';
    this.modelo = '';
    this.tipo_switch = '';
    this.tipo_layout = '';
    this.precio = null;
    this.estado = 'Disponible';
    this.stock_actual = null;
    this.stock_minimo = null;
    this.cdr.detectChanges();
  }
}
