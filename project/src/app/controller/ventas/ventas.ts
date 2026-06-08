import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../../services/ventas-service';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class Ventas implements OnInit {
  idVentaEditando: number | null = null;

  fecha = '';
  subtotal: number = 0;
  descuento: number = 0;
  total: number = 0;
  estado = 'Pagada';

  id_cliente: number | null = null;
  id_vendedor: number | null = null;

  id_producto: number | null = null;
  cantidad: number | null = null;
  precio_unitario: number = 0;
  descuento_detalle: number = 0;
  subtotal_detalle: number = 0;

  metodo_pago = 'Efectivo';
  monto: number = 0;
  moneda = 'PEN';
  estado_pago = 'Pagado';
  fecha_pago = '';
  referencia = '';

  clientes: any[] = [];
  vendedores: any[] = [];
  productosInventario: any[] = [];
  ventas: any[] = [];
  ventasDetalle: any[] = [];

  mensaje = '';

  rol: string = '';

  constructor(
    private ventasService: VentasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
  this.rol = localStorage.getItem('rol') || '';

  this.cargarClientes();
  this.cargarVendedores();
  this.cargarProductosInventario();
  this.cargarVentas();
  this.cargarVentasDetalle();
}

  guardar(): void {
    this.calcularTotales();

    const venta = {
      fecha: this.fecha,
      subtotal: this.subtotal,
      descuento: this.descuento,
      total: this.total,
      estado: this.estado,
      id_cliente: this.id_cliente,
      id_vendedor: this.id_vendedor,

      id_producto: this.id_producto,
      cantidad: this.cantidad,
      precio_unitario: this.precio_unitario,
      descuento_detalle: this.descuento_detalle,
      subtotal_detalle: this.subtotal_detalle,

      metodo_pago: this.metodo_pago,
      monto: this.monto,
      moneda: this.moneda,
      estado_pago: this.estado_pago,
      fecha_pago: this.fecha_pago,
      referencia: this.referencia,
    };

    if (this.idVentaEditando) {
      this.ventasService.modificarVenta(this.idVentaEditando, venta).subscribe({
        next: (res) => {
          this.mensaje = res.message;
          this.limpiarFormulario();
          this.cargarVentas();
          this.cargarVentasDetalle();
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al modificar venta';
          this.cdr.detectChanges();
        },
      });
    } else {
      this.ventasService.registrarVenta(venta).subscribe({
        next: (res) => {
          this.mensaje = res.message;
          this.limpiarFormulario();
          this.cargarVentas();
          this.cargarVentasDetalle();
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al registrar venta';
          this.cdr.detectChanges();
        },
      });
    }
  }

  cargarClientes(): void {
    this.ventasService.obtenerClientes().subscribe({
      next: (data) => {
        this.clientes = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar clientes:', err),
    });
  }

  cargarVendedores(): void {
    this.ventasService.obtenerVendedores().subscribe({
      next: (data) => {
        this.vendedores = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar vendedores:', err),
    });
  }

  cargarProductosInventario(): void {
    this.ventasService.obtenerProductosInventario().subscribe({
      next: (data) => {
        this.productosInventario = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar productos:', err),
    });
  }

  cargarVentas(): void {
    this.ventasService.obtenerVentas().subscribe({
      next: (data) => {
        this.ventas = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar ventas:', err),
    });
  }

  cargarVentasDetalle(): void {
    this.ventasService.obtenerVentasDetalle().subscribe({
      next: (data) => {
        this.ventasDetalle = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar ventas con detalle:', err),
    });
  }

  seleccionarProducto(): void {
    const producto = this.productosInventario.find(
      (item) => item.id_producto == this.id_producto
    );

    if (producto) {
      this.precio_unitario = producto.precio;
      this.calcularTotales();
    }
  }

  calcularTotales(): void {
    const cantidadFinal = this.cantidad || 0;
    const precioFinal = this.precio_unitario || 0;
    const descuentoDetalleFinal = this.descuento_detalle || 0;
    const descuentoVentaFinal = this.descuento || 0;

    this.subtotal_detalle = cantidadFinal * precioFinal - descuentoDetalleFinal;
    this.subtotal = this.subtotal_detalle;
    this.total = this.subtotal - descuentoVentaFinal;
    this.monto = this.total;
  }

  editar(venta: any): void {
    this.idVentaEditando = venta.id_venta;

    this.fecha = venta.fecha?.substring(0, 10);
    this.subtotal = venta.subtotal;
    this.descuento = venta.descuento;
    this.total = venta.total;
    this.estado = venta.estado;

    this.id_cliente = venta.id_cliente;
    this.id_vendedor = venta.id_vendedor;

    this.id_producto = venta.id_producto;
    this.cantidad = venta.cantidad;
    this.precio_unitario = venta.precio_unitario;
    this.descuento_detalle = venta.descuento_detalle;
    this.subtotal_detalle = venta.subtotal_detalle;

    this.metodo_pago = venta.metodo_pago;
    this.monto = venta.monto;
    this.moneda = venta.moneda;
    this.estado_pago = venta.estado_pago;
    this.fecha_pago = venta.fecha_pago?.substring(0, 10);
    this.referencia = venta.referencia;

    this.cdr.detectChanges();
  }


  eliminarFisico(id: number): void {
    this.ventasService.eliminarFisico(id).subscribe({
      next: (res) => {
        this.mensaje = res.message;
        this.cargarVentas();
        this.cargarVentasDetalle();
      },
      error: (err) => {
        this.mensaje = err.error?.error || 'Error al eliminar físicamente';
        this.cdr.detectChanges();
      },
    });
  }

  limpiarFormulario(): void {
    this.idVentaEditando = null;

    this.fecha = '';
    this.subtotal = 0;
    this.descuento = 0;
    this.total = 0;
    this.estado = 'Pagada';

    this.id_cliente = null;
    this.id_vendedor = null;

    this.id_producto = null;
    this.cantidad = null;
    this.precio_unitario = 0;
    this.descuento_detalle = 0;
    this.subtotal_detalle = 0;

    this.metodo_pago = 'Efectivo';
    this.monto = 0;
    this.moneda = 'PEN';
    this.estado_pago = 'Pagado';
    this.fecha_pago = '';
    this.referencia = '';

    this.cdr.detectChanges();
  }
}