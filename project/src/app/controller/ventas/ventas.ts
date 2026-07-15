import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../../services/ventas-service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
// Controlador para gestionar el terminal de Ventas
export class Ventas implements OnInit {
  idVentaEditando: number | null = null;

  fecha = new Date().toISOString().split('T')[0];
  subtotal: number = 0;
  descuento: number = 0;
  total: number = 0;
  estado = 'Pagada';

  id_cliente: number | null = null;
  id_vendedor: number | null = null;

  carrito: any[] = [];
  productoSeleccionado: number | null = null;
  cantidadSeleccionada: number | null = null;

  metodo_pago = 'Efectivo';
  monto: number = 0;
  moneda = 'PEN';
  estado_pago = 'Pagado';
  fecha_pago = new Date().toISOString().split('T')[0];

  clientes: any[] = [];
  vendedores: any[] = [];
  productosInventario: any[] = [];
  ventas: any[] = [];
  ventasDetalle: any[] = [];

  mensaje = '';
  mostrarRecibo = false;
  reciboDatos: any = null;

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
    if (!this.fecha || !this.id_cliente || !this.id_vendedor || !this.fecha_pago) {
      this.mensaje = 'Todos los datos de la venta y fecha de pago son obligatorios para proceder.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.calcularTotales();
    this.estado = this.estado_pago === 'Pagado' ? 'Pagada' : 'Pendiente';

    if (this.carrito.length === 0 && !this.idVentaEditando) {
      this.mensaje = 'Debe agregar al menos un producto al carrito.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const venta = {
      fecha: this.fecha,
      subtotal: this.subtotal,
      descuento: this.descuento,
      total: this.total,
      estado: this.estado,
      id_cliente: this.id_cliente,
      id_vendedor: this.id_vendedor,

      productos: this.carrito,

      metodo_pago: this.metodo_pago,
      monto: this.monto,
      moneda: this.moneda,
      estado_pago: this.estado_pago,
      fecha_pago: this.fecha_pago,
    };

    if (this.idVentaEditando) {
      this.ventasService.modificarVenta(this.idVentaEditando, venta).subscribe({
        next: (res) => {
          this.mensaje = res.message;
          this.mostrarModalRecibo(this.idVentaEditando!);
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
          this.mostrarModalRecibo(res.id_venta);
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

  agregarAlCarrito(): void {
    if (!this.productoSeleccionado || !this.cantidadSeleccionada || this.cantidadSeleccionada <= 0) {
      this.mensaje = 'Seleccione un producto y una cantidad válida mayor a 0.';
      return;
    }

    const prod = this.productosInventario.find((p) => p.id_producto == this.productoSeleccionado);
    if (!prod) return;

    if (this.cantidadSeleccionada > prod.stock_actual) {
      this.mensaje = `Stock insuficiente para ${prod.nombre}. Disponible: ${prod.stock_actual}`;
      return;
    }

    const subtotalItem = prod.precio * this.cantidadSeleccionada;

    this.carrito.push({
      id_producto: prod.id_producto,
      nombre: prod.nombre,
      marca: prod.marca || '-',
      cantidad: this.cantidadSeleccionada,
      precio_unitario: prod.precio,
      subtotal: subtotalItem
    });

    this.productoSeleccionado = null;
    this.cantidadSeleccionada = null;
    this.calcularTotales();
    this.mensaje = '';
  }

  eliminarDelCarrito(index: number): void {
    this.carrito.splice(index, 1);
    this.calcularTotales();
  }

  calcularTotales(): void {
    if (!this.idVentaEditando) {
      this.subtotal = this.carrito.reduce((acc, item) => acc + item.subtotal, 0);
    }
    this.total = Math.max(0, this.subtotal - (this.descuento || 0));
    this.monto = this.total;
  }

  editar(venta: any): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.idVentaEditando = venta.id_venta;

    this.fecha = venta.fecha?.substring(0, 10);
    this.subtotal = venta.subtotal;
    this.descuento = venta.descuento;
    this.total = venta.total;
    this.estado = venta.estado;

    this.id_cliente = venta.id_cliente;
    this.id_vendedor = venta.id_vendedor;

    // En edición, ocultamos o vaciamos el carrito porque no se permite editarlo.
    this.carrito = [];
    this.productoSeleccionado = null;
    this.cantidadSeleccionada = null;

    this.metodo_pago = venta.metodo_pago;
    this.monto = venta.monto;
    this.moneda = venta.moneda;
    this.estado_pago = venta.estado_pago;
    this.fecha_pago = venta.fecha_pago?.substring(0, 10);

    this.cdr.detectChanges();
  }
  reimprimirComprobante(id: number): void {
    this.ventasService.obtenerRecibo(id).subscribe({
      next: (res) => {
        this.reciboDatos = res;
        this.mostrarRecibo = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mensaje = 'No se pudo obtener el comprobante de esta venta.';
        this.cdr.detectChanges();
      }
    });
  }

  cancelarVenta(id: number): void {
    if (confirm('¿Estás seguro de que deseas CANCELAR esta venta? Esta acción anulará el registro y se auditará en el historial.')) {
      
      // Optimistic UI update para fluidez instantánea
      const index = this.ventasDetalle.findIndex(v => v.id_venta === id);
      if (index !== -1) {
        this.ventasDetalle[index].estado = 'Cancelada';
        this.cdr.detectChanges();
      }

      this.ventasService.eliminarLogico(id).subscribe({
        next: (res) => {
          this.mensaje = res.message;
          this.cargarVentas();
          this.cargarVentasDetalle();
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al cancelar la venta';
          this.cdr.detectChanges();
        },
      });
    }
  }

  limpiarFormulario(): void {
    this.idVentaEditando = null;

    this.fecha = new Date().toISOString().split('T')[0];
    this.subtotal = 0;
    this.descuento = 0;
    this.total = 0;
    this.estado = 'Pagada';

    this.id_cliente = null;
    this.id_vendedor = null;

    this.carrito = [];
    this.productoSeleccionado = null;
    this.cantidadSeleccionada = null;

    this.metodo_pago = 'Efectivo';
    this.monto = 0;
    this.moneda = 'PEN';
    this.estado_pago = 'Pagado';
    this.fecha_pago = new Date().toISOString().split('T')[0];

    this.cdr.detectChanges();
  }

  mostrarModalRecibo(idVenta: number): void {
    const clienteObj = this.clientes.find(c => c.id_cliente === this.id_cliente);
    const clienteNombre = clienteObj?.nombre || 'Desconocido';
    const clienteTelefono = clienteObj?.telefono || 'No registrado';
    const clienteDni = clienteObj?.dni || 'No registrado';
    const clienteCorreo = clienteObj?.correo || 'No registrado';
    const vendedorNombre = this.vendedores.find(v => v.id_vendedor === this.id_vendedor)?.nombre || 'Desconocido';

    this.reciboDatos = {
      id_venta: idVenta,
      fecha: this.fecha,
      cliente: clienteNombre,
      cliente_telefono: clienteTelefono,
      cliente_dni: clienteDni,
      cliente_correo: clienteCorreo,
      vendedor: vendedorNombre,
      productos: this.carrito,
      metodo_pago: this.metodo_pago,
      moneda: this.moneda,
      total: this.total
    };
    this.mostrarRecibo = true;
    this.cdr.detectChanges();
  }

  cerrarRecibo(): void {
    this.mostrarRecibo = false;
    this.reciboDatos = null;
    this.limpiarFormulario();
    window.location.reload();
  }

  async generarPDFRecibo(): Promise<void> {
    if (!this.reciboDatos) return;

    const doc = new jsPDF();
    
    const pageW = doc.internal.pageSize.width;
    const pageH = doc.internal.pageSize.height;
    const M = 15;
    const NEGRO: [number, number, number] = [30, 41, 59];
    const GRIS: [number, number, number] = [100, 116, 139];
    const OSCURO: [number, number, number] = [15, 23, 42];
    const CLARO: [number, number, number] = [215, 215, 215];
    const FONDO: [number, number, number] = [245, 245, 245];
    const BLANCO: [number, number, number] = [255, 255, 255];

    const logoImg = new Image();
    logoImg.src = '/logo_empresa.png';

    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = () => resolve(null);
    });

    doc.setFillColor(...NEGRO);
    doc.rect(0, 0, pageW, 23, 'F');

    let logoEndX = M;
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      const lh = 12;
      const lw = (logoImg.width * lh) / logoImg.height;
      doc.addImage(logoImg, 'PNG', M, 5, lw, lh);
      logoEndX = M + lw + 4;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BLANCO);
    doc.text('TechPerú S.A.C.', logoEndX, 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...CLARO);
    doc.text('RUC: 20123456789', logoEndX, 13);
    doc.text('San Isidro, Lima, Perú', logoEndX, 17.5);
    doc.text('www.techperu-store.com.pe', logoEndX, 22);

    doc.setFillColor(...OSCURO);
    doc.rect(0, 23, pageW, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BLANCO);
    doc.text('COMPROBANTE DE VENTA', M, 28);

    doc.setFillColor(...FONDO);
    doc.rect(0, pageH - 10, pageW, 10, 'F');
    doc.setDrawColor(...CLARO);
    doc.setLineWidth(0.3);
    doc.line(0, pageH - 10, pageW, pageH - 10);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRIS);
    doc.text('DOCUMENTO CONFIDENCIAL — Generado automáticamente por el Sistema de Ventas TechPerú S.A.C.', M, pageH - 4.5);

    let fechaFormat = this.reciboDatos.fecha;
    try {
      fechaFormat = new Date(this.reciboDatos.fecha).toLocaleDateString('es-PE');
    } catch (e) {}

    let Y = 36;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...NEGRO);
    doc.text('COMPROBANTE DE VENTA', M, Y + 8);

    doc.setDrawColor(...CLARO);
    doc.setLineWidth(0.5);
    doc.line(M, Y + 11, pageW - M, Y + 11);

    Y += 17;
    doc.setFillColor(...FONDO);
    doc.setDrawColor(...CLARO);
    doc.setLineWidth(0.3);
    doc.rect(M, Y, pageW - M * 2, 42, 'FD');

    const c2 = pageW / 2 + 2;
    const c3 = pageW / 2 + 45;

    const metaData = [
      { lbl: 'N° DE COMPROBANTE', val: `#${this.reciboDatos.id_venta}`, x: M + 4, y: Y + 7 },
      { lbl: 'FECHA DE EMISIÓN', val: fechaFormat, x: c2, y: Y + 7 },
      { lbl: 'VENDEDOR', val: this.reciboDatos.vendedor, x: c3, y: Y + 7 },
      { lbl: 'CLIENTE', val: this.reciboDatos.cliente, x: M + 4, y: Y + 21 },
      { lbl: 'DNI', val: this.reciboDatos.cliente_dni, x: c2, y: Y + 21 },
      { lbl: 'TELÉFONO', val: this.reciboDatos.cliente_telefono, x: c3, y: Y + 21 },
      { lbl: 'CORREO', val: this.reciboDatos.cliente_correo, x: M + 4, y: Y + 35 },
    ];

    metaData.forEach((m) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...GRIS);
      doc.text(m.lbl, m.x, m.y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...NEGRO);
      doc.text(m.val, m.x, m.y + 5);
    });

    Y += 49;

    const headColor = [248, 250, 252] as [number, number, number];
    const headText = [100, 116, 139] as [number, number, number];
    const bodyText = [33, 37, 41] as [number, number, number];
    const lineColor = [230, 230, 230] as [number, number, number];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NEGRO);
    doc.text('PRODUCTOS LLEVADOS', M, Y + 4);
    Y += 8;

    autoTable(doc, {
      startY: Y,
      head: [['PRODUCTO', 'MARCA', 'CANTIDAD', 'P. UNITARIO', 'IMPORTE']],
      body: this.reciboDatos.productos.map((p: any) => [
        p.nombre,
        p.marca || '-',
        `${p.cantidad}`,
        `S/ ${Number(p.precio_unitario).toFixed(2)}`,
        `S/ ${Number(p.subtotal).toFixed(2)}`
      ]),
      theme: 'grid',
      styles: { lineColor, lineWidth: 0.1, fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: headColor, textColor: headText, fontStyle: 'bold', fontSize: 9, cellPadding: 4 },
      bodyStyles: { fontSize: 10, cellPadding: 4, textColor: bodyText },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setTextColor(...NEGRO);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL PAGADO: S/ ${Number(this.reciboDatos.total).toFixed(2)}`, pageW - M, finalY, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(...GRIS);
    doc.text(`MÉTODO DE PAGO: ${this.reciboDatos.metodo_pago.toUpperCase()} (${this.reciboDatos.moneda})`, M, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Esta transacción confirma que los artículos han sido entregados y aceptados en conformidad.', M, finalY + 8);
    doc.text('Para cualquier cambio o devolución, es indispensable presentar este comprobante de pago.', M, finalY + 12);

    doc.save(`Comprobante_Venta_${this.reciboDatos.id_venta}.pdf`);
  }
}