import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportesService } from '../../services/reportes.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type TipoReporte =
  | 'estadisticas'
  | 'ingresos'
  | 'eliminaciones'
  | 'ventasFechas'
  | 'indicadoresVentas'
  | 'ventasInventario';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  rol: string = '';
  reporteSeleccionado: TipoReporte | '' = '';

  filtroRango: string = 'semana';
  fechaInicio: string = '';
  fechaFin: string = '';
  periodo: number = 7;

  resultadosAnalitico: any = null;
  resultadosEliminaciones: any[] | null = null;

  // NUEVO: reportes separados para tu parte
  resultadosVentasPorFechas: any[] | null = null;
  resultadosIndicadoresVentas: any = null;

  // Compatibilidad temporal por si tu HTML aún tiene la tarjeta antigua de ventasInventario
  resultadosVentasInventario: any = null;

  cargando: boolean = false;
  esPeriodoLargo: boolean = false;
  ventasAgrupadas: { mes: string, ventas: any[] }[] = [];
  mensaje: string = '';

  constructor(
    private reportesService: ReportesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.rol = localStorage.getItem('rol') || '';

    if (this.rol !== 'administrador') {
      this.router.navigate(['/inicio']);
    }

    this.calcularFechasParaRango('semana');
  }

  volver(): void {
    this.router.navigate(['/inicio']);
  }

  seleccionarReporte(tipo: TipoReporte): void {
    this.reporteSeleccionado = tipo;

    this.resultadosAnalitico = null;
    this.resultadosEliminaciones = null;
    this.resultadosVentasPorFechas = null;
    this.resultadosIndicadoresVentas = null;
    this.resultadosVentasInventario = null;

    this.mensaje = '';

    if (this.fechaInicio && this.fechaFin) {
      if (new Date(this.fechaInicio) > new Date(this.fechaFin)) {
        this.mensaje = 'La fecha de inicio no puede ser posterior a la fecha de fin.';
        return;
      }

      this.ejecutarConsulta();
    }
  }

  cambiarPeriodo(): void {
    const hoy = new Date();
    this.fechaFin = hoy.toISOString().split('T')[0];

    const d = new Date();
    d.setDate(d.getDate() - this.periodo);
    this.fechaInicio = d.toISOString().split('T')[0];

    if (this.reporteSeleccionado) {
      this.ejecutarConsulta();
    }
  }

  limpiarResultados(): void {
    this.resultadosAnalitico = null;
    this.resultadosEliminaciones = null;
    this.resultadosVentasPorFechas = null;
    this.resultadosIndicadoresVentas = null;
    this.resultadosVentasInventario = null;
    this.mensaje = '';
  }

  calcularFechasParaRango(rango: string): void {
    const hoy = new Date();
    this.fechaFin = hoy.toISOString().split('T')[0];

    if (rango === 'hoy') {
      this.fechaInicio = this.fechaFin;
    } else if (rango === 'semana') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      this.fechaInicio = d.toISOString().split('T')[0];
    } else if (rango === 'mes') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      this.fechaInicio = d.toISOString().split('T')[0];
    } else if (rango === 'anio') {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      this.fechaInicio = d.toISOString().split('T')[0];
    }
  }

  aplicarFiltroRapido(): void {
    if (this.filtroRango !== 'custom') {
      this.calcularFechasParaRango(this.filtroRango);
    }

    if (this.reporteSeleccionado) {
      this.generarPrevisualizacion();
    }
  }

  generarPrevisualizacion(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      this.mensaje = 'Por favor selecciona un rango de fechas válido.';
      return;
    }

    if (this.fechaInicio > this.fechaFin) {
      this.mensaje = 'La fecha de inicio no puede ser mayor que la fecha de fin.';
      return;
    }

    this.ejecutarConsulta();
  }

  agruparPorMes(ventas: any[]): { mes: string, ventas: any[] }[] {
    if (!ventas) return [];
    const grupos: { [key: string]: any[] } = {};
    ventas.forEach(v => {
      const fecha = new Date(v.fecha);
      const mesNombre = fecha.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
      const mesClave = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);
      
      if (!grupos[mesClave]) grupos[mesClave] = [];
      grupos[mesClave].push(v);
    });
    return Object.keys(grupos).map(k => ({ mes: k, ventas: grupos[k] }));
  }

  ejecutarConsulta(): void {
    if (this.fechaInicio && this.fechaFin) {
      const diffTime = Math.abs(new Date(this.fechaFin).getTime() - new Date(this.fechaInicio).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      this.esPeriodoLargo = diffDays > 31;
    } else {
      this.esPeriodoLargo = false;
    }

    this.cargando = true;
    this.mensaje = '';

    if (
      this.reporteSeleccionado === 'estadisticas' ||
    this.reporteSeleccionado === 'ingresos'
  ) {
    this.reportesService.obtenerAnaliticoVentas(this.fechaInicio, this.fechaFin).subscribe({
      next: (data) => {
        this.resultadosAnalitico = data;
        if (this.esPeriodoLargo && data.todasVentas) {
          this.ventasAgrupadas = this.agruparPorMes(data.todasVentas);
        } else {
          this.ventasAgrupadas = [];
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mensaje = err.error?.error || 'Error al obtener la información de ventas.';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });

  } else if (this.reporteSeleccionado === 'eliminaciones') {
    this.reportesService.obtenerEliminaciones(this.fechaInicio, this.fechaFin).subscribe({
      next: (data) => {
        this.resultadosEliminaciones = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mensaje = err.error?.error || 'Error al obtener el registro de ventas canceladas.';
        this.resultadosEliminaciones = [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });

  } else if (this.reporteSeleccionado === 'ventasFechas') {
    this.reportesService.obtenerVentasPorFechas(this.fechaInicio, this.fechaFin).subscribe({
      next: (data) => {
        console.log('Ventas por fechas:', data);
        this.resultadosVentasPorFechas = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error ventas por fechas:', err);
        this.mensaje = err.error?.error || 'Error al obtener el reporte de ventas por fechas.';
        this.resultadosVentasPorFechas = [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });

  } else if (this.reporteSeleccionado === 'indicadoresVentas') {
    this.reportesService.obtenerIndicadoresVentas(this.fechaInicio, this.fechaFin).subscribe({
      next: (data) => {
        console.log('Indicadores de ventas:', data);
        this.resultadosIndicadoresVentas = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error indicadores ventas:', err);
        this.mensaje = err.error?.error || 'Error al obtener los indicadores de ventas.';
        this.resultadosIndicadoresVentas = null;
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });

  } else {
    this.mensaje = 'No se reconoció el tipo de reporte seleccionado.';
    this.cargando = false;
    this.cdr.detectChanges();
  }
}

  formatearMonto(valor: any): string {
    return (parseFloat(valor) || 0).toFixed(2);
  }

  async descargarPDF(): Promise<void> {
    if (!this.reporteSeleccionado) {
      this.mensaje = 'Selecciona un tipo de reporte primero.';
      return;
    }

    if (
      (this.reporteSeleccionado === 'estadisticas' && !this.resultadosAnalitico) ||
      (this.reporteSeleccionado === 'ingresos' && !this.resultadosAnalitico) ||
      (this.reporteSeleccionado === 'eliminaciones' && !this.resultadosEliminaciones) ||
      (this.reporteSeleccionado === 'ventasFechas' && !this.resultadosVentasPorFechas) ||
      (this.reporteSeleccionado === 'indicadoresVentas' && !this.resultadosIndicadoresVentas) ||
      (this.reporteSeleccionado === 'ventasInventario' && !this.resultadosVentasInventario)
    ) {
      this.mensaje = 'Primero genera una previsualización con datos antes de descargar el PDF.';
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const M = 14;

      const fechaEmision = new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const horaEmision = new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const nReporte = `REP-${Date.now().toString().slice(-6)}`;

      const titulos: Record<string, string> = {
        estadisticas: 'REPORTE DE ESTADÍSTICA DE VENTAS',
        ingresos: 'REPORTE DE INGRESOS DIARIOS',
        eliminaciones: 'HISTORIAL DE ELIMINACIONES',
        ventasFechas: 'REPORTE DE VENTAS POR FECHAS',
        indicadoresVentas: 'REPORTE DE INDICADORES DE VENTAS',
        ventasInventario: 'REPORTE DE VENTAS, INVENTARIO E INDICADORES',
      };

      const titulo = titulos[this.reporteSeleccionado] || 'REPORTE ADMINISTRATIVO';

      const NEGRO: [number, number, number] = [20, 20, 20];
      const OSCURO: [number, number, number] = [60, 60, 60];
      const GRIS: [number, number, number] = [120, 120, 120];
      const CLARO: [number, number, number] = [215, 215, 215];
      const FONDO: [number, number, number] = [245, 245, 245];
      const BLANCO: [number, number, number] = [255, 255, 255];

      const logoImg = new Image();
      logoImg.src = '/logo_empresa.png';

      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = () => resolve(null);
      });

      const membrete = (pageNum: number, totalPages: number) => {
        doc.setFillColor(...NEGRO);
        doc.rect(0, 0, pageW, 16, 'F');

        let logoEndX = M;

        if (logoImg.complete && logoImg.naturalWidth > 0) {
          const lh = 10;
          const lw = (logoImg.width * lh) / logoImg.height;
          doc.addImage(logoImg, 'PNG', M, 3, lw, lh);
          logoEndX = M + lw + 3;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...BLANCO);
        doc.text('TechPerú S.A.C.', logoEndX, 9);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...CLARO);
        doc.text(
          'www.techperu-store.com.pe  |  RUC: 20123456789  |  San Isidro, Lima, Perú',
          logoEndX,
          14
        );

        doc.setTextColor(...CLARO);
        doc.setFontSize(7.5);
        doc.text(`${nReporte}  |  Pág. ${pageNum} de ${totalPages}`, pageW - M, 11, {
          align: 'right',
        });

        doc.setFillColor(...OSCURO);
        doc.rect(0, 16, pageW, 7, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...BLANCO);
        doc.text(titulo, M, 21);

        doc.setFillColor(...FONDO);
        doc.rect(0, pageH - 10, pageW, 10, 'F');

        doc.setDrawColor(...CLARO);
        doc.setLineWidth(0.3);
        doc.line(0, pageH - 10, pageW, pageH - 10);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(...GRIS);
        doc.text(
          'DOCUMENTO CONFIDENCIAL — Generado automáticamente por el Sistema de Ventas TechPerú S.A.C.',
          M,
          pageH - 4.5
        );

        doc.setFont('helvetica', 'normal');
        doc.text(`Emitido: ${fechaEmision} ${horaEmision}`, pageW - M, pageH - 4.5, {
          align: 'right',
        });
      };

      membrete(1, 1);

      let Y = 28;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(...NEGRO);
      doc.text(titulo, M, Y + 8);

      doc.setDrawColor(...CLARO);
      doc.setLineWidth(0.5);
      doc.line(M, Y + 11, pageW - M, Y + 11);

      Y += 17;

      doc.setFillColor(...FONDO);
      doc.setDrawColor(...CLARO);
      doc.setLineWidth(0.3);
      doc.rect(M, Y, pageW - M * 2, 26, 'FD');

      const c2 = pageW / 2 + 2;

      const metaData = [
        { lbl: 'N° DE REPORTE', val: nReporte, x: M + 4 },
        { lbl: 'FECHA DE EMISIÓN', val: fechaEmision, x: c2 },
        { lbl: 'PERIODO ANALIZADO', val: `Del ${this.fechaInicio} al ${this.fechaFin}`, x: M + 4 },
        { lbl: 'ELABORADO POR', val: 'Sistema de Ventas TechPerú S.A.C.', x: c2 },
      ];

      metaData.forEach((m, i) => {
        const ry = Y + (i < 2 ? 7 : 18);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...GRIS);
        doc.text(m.lbl, m.x, ry);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...NEGRO);
        doc.text(m.val, m.x, ry + 4.5);
      });

      Y += 32;

      const headColor = [248, 250, 252] as [number, number, number];
      const headText = [100, 116, 139] as [number, number, number];
      const bodyText = [33, 37, 41] as [number, number, number];
      const lineColor = [230, 230, 230] as [number, number, number];

      const seccion = (label: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...NEGRO);
        doc.text(label.toUpperCase(), M, Y + 4);
        Y += 8;
      };

      const onNuevaPagina = (d: any) => {
        if (d.pageNumber > 1) {
          membrete(d.pageNumber, 99);
        }
      };

      if (this.reporteSeleccionado === 'estadisticas' && this.resultadosAnalitico) {
        const r = this.resultadosAnalitico.resumen;

        seccion('RESUMEN DE ESTADÍSTICAS');

        autoTable(doc, {
          startY: Y,
          head: [['MÉTRICA', 'VALOR']],
          body: [
            [
              r?.id_venta_maxima ? `Venta Máxima (ID: #${r.id_venta_maxima})` : 'Venta Máxima',
              `S/ ${this.formatearMonto(r?.venta_maxima || 0)}`
            ],
            [
              r?.id_venta_minima ? `Venta Mínima (ID: #${r.id_venta_minima})` : 'Venta Mínima',
              `S/ ${this.formatearMonto(r?.venta_minima || 0)}`
            ],
            ['Venta Promedio', `S/ ${this.formatearMonto(r?.venta_promedio || 0)}`],
          ],
          theme: 'grid',
          styles: { lineColor, lineWidth: 0.1 },
          headStyles: { fillColor: headColor, textColor: headText, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: bodyText },
          columnStyles: { 1: { halign: 'right', textColor: bodyText } },
          margin: { left: M, right: M, bottom: 14 },
          didDrawPage: onNuevaPagina,
        });

        Y = (doc as any).lastAutoTable.finalY + 6;

        if (this.esPeriodoLargo && this.ventasAgrupadas.length > 0) {
          this.ventasAgrupadas.forEach((grupo, idx) => {
            if (idx > 0) {
              Y = (doc as any).lastAutoTable.finalY + 8;
            }
            seccion(`VENTAS DE ${grupo.mes.toUpperCase()}`);
            
            const tbody = grupo.ventas.map((v: any, i: number) => [
              `${i + 1}°`,
              `#${v.id_venta}`,
              new Date(v.fecha).toLocaleDateString('es-PE'),
              `S/ ${this.formatearMonto(v.total)}`,
            ]);

            autoTable(doc, {
              startY: Y,
              head: [['N°', 'ID VENTA', 'FECHA', 'MONTO']],
              body: tbody,
              theme: 'grid',
              styles: { lineColor, lineWidth: 0.1 },
              headStyles: { fillColor: headColor, textColor: headText, fontStyle: 'bold', fontSize: 8 },
              bodyStyles: { fontSize: 8, textColor: bodyText },
              columnStyles: { 0: { cellWidth: 20 }, 3: { halign: 'right', fontStyle: 'bold' } },
              margin: { left: M, right: M, bottom: 14 },
              didDrawPage: onNuevaPagina,
            });
          });
        } else {
          seccion('DETALLE DE TODAS LAS VENTAS');
          const todasBody = (this.resultadosAnalitico.todasVentas || []).map((v: any, i: number) => [
            `${i + 1}°`,
            `#${v.id_venta}`,
            new Date(v.fecha).toLocaleDateString('es-PE'),
            `S/ ${this.formatearMonto(v.total)}`,
          ]);

          if (!todasBody.length) {
            todasBody.push(['-', '-', 'Sin ventas en el periodo seleccionado', '-']);
          }

          autoTable(doc, {
            startY: Y,
            head: [['N°', 'ID VENTA', 'FECHA', 'MONTO']],
            body: todasBody,
            theme: 'grid',
            styles: { lineColor, lineWidth: 0.1 },
            headStyles: { fillColor: headColor, textColor: headText, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8, textColor: bodyText },
            columnStyles: { 0: { cellWidth: 20 }, 3: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: M, right: M, bottom: 14 },
            didDrawPage: onNuevaPagina,
          });
        }

      } else if (this.reporteSeleccionado === 'ingresos' && this.resultadosAnalitico) {
        const r = this.resultadosAnalitico.resumen;

        seccion('RESUMEN DE INGRESOS');

        autoTable(doc, {
          startY: Y,
          head: [['INGRESOS TOTALES', 'CANTIDAD DE VENTAS']],
          body: [[`S/ ${this.formatearMonto(r?.ingresos_totales || 0)}`, `${r?.total_ventas || 0}`]],
          theme: 'grid',
          styles: { lineColor, lineWidth: 0.1 },
          headStyles: { fillColor: headColor, textColor: headText, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 10, textColor: bodyText, fontStyle: 'bold' },
          columnStyles: { 1: { halign: 'right' } },
          margin: { left: M, right: M, bottom: 14 },
          didDrawPage: onNuevaPagina,
        });

        Y = (doc as any).lastAutoTable.finalY + 6;

        seccion('REPORTE DE INGRESOS');

        const desBody = (this.resultadosAnalitico.desgloseDiario || []).map((d: any) => [
          new Date(d.fecha_diaria).toLocaleDateString('es-PE'),
          `${d.cantidad_diaria}`,
          `S/ ${this.formatearMonto(d.total_diario)}`,
        ]);

        if (!desBody.length) {
          desBody.push(['Sin movimientos en el periodo', '-', '-']);
        }

        autoTable(doc, {
          startY: Y,
          head: [['FECHA DE OPERACIÓN', 'N° OPERACIONES', 'TOTAL RECAUDADO']],
          body: desBody,
          theme: 'grid',
          styles: { lineColor, lineWidth: 0.1 },
          headStyles: { fillColor: headColor, textColor: headText, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: bodyText },
          columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: M, right: M, bottom: 14 },
          didDrawPage: onNuevaPagina,
        });

      } else if (this.reporteSeleccionado === 'eliminaciones' && this.resultadosEliminaciones) {
        seccion('RESUMEN DE AUDITORÍA');

        autoTable(doc, {
          startY: Y,
          head: [['TOTAL VENTAS CANCELADAS']],
          body: [[`${this.resultadosEliminaciones.length} ventas`]],
          theme: 'grid',
          styles: { lineColor, lineWidth: 0.1 },
          headStyles: { fillColor: headColor, textColor: headText, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 10, textColor: bodyText, fontStyle: 'bold' },
          margin: { left: M, right: M, bottom: 14 },
          didDrawPage: onNuevaPagina,
        });

        Y = (doc as any).lastAutoTable.finalY + 6;

        seccion('DETALLE DE VENTAS CANCELADAS');

        const elBody = (this.resultadosEliminaciones || []).map((e: any, i: number) => [
          `${i + 1}`,
          `#${e.id_registro || 'N/A'}`,
          e.cliente || '-',
          `S/ ${this.formatearMonto(e.monto)}`,
          e.fecha ? new Date(e.fecha).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
        ]);

        if (!elBody.length) {
          elBody.push(['-', '-', 'Sin ventas canceladas en el periodo seleccionado', '-', '-']);
        }

        autoTable(doc, {
          startY: Y,
          head: [['N°', 'ID VENTA', 'CLIENTE', 'MONTO', 'FECHA CANCELACIÓN']],
          body: elBody,
          theme: 'grid',
          styles: { lineColor, lineWidth: 0.1 },
          headStyles: { fillColor: headColor, textColor: headText, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: bodyText },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 30, fontStyle: 'bold' },
            3: { halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: M, right: M, bottom: 14 },
          didDrawPage: onNuevaPagina,
        });

      } else if (this.reporteSeleccionado === 'ventasFechas' && this.resultadosVentasPorFechas) {
        seccion('VENTAS POR FECHAS');

        const ventasBody = (this.resultadosVentasPorFechas || []).map((v: any) => [
          `#${v.id_venta}`,
          new Date(v.fecha).toLocaleDateString('es-PE'),
          v.cliente || '-',
          v.vendedor || '-',
          v.producto || '-',
          `${v.cantidad || 0}`,
          v.metodo_pago || '-',
          `S/ ${this.formatearMonto(v.total || 0)}`,
        ]);

        if (!ventasBody.length) {
          ventasBody.push(['-', '-', '-', '-', 'Sin ventas en el periodo seleccionado', '-', '-', '-']);
        }

        autoTable(doc, {
          startY: Y,
          head: [['ID', 'FECHA', 'CLIENTE', 'VENDEDOR', 'PRODUCTO', 'CANT.', 'PAGO', 'TOTAL']],
          body: ventasBody,
          theme: 'grid',
          styles: { lineColor, lineWidth: 0.1, fontSize: 7 },
          headStyles: { fillColor: headColor, textColor: headText, fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7, textColor: bodyText },
          columnStyles: {
            5: { halign: 'center' },
            7: { halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: M, right: M, bottom: 14 },
          didDrawPage: onNuevaPagina,
        });

      } else if (this.reporteSeleccionado === 'indicadoresVentas' && this.resultadosIndicadoresVentas) {
        const ind = this.resultadosIndicadoresVentas;

        seccion('INDICADORES DE VENTAS');

        autoTable(doc, {
          startY: Y,
          head: [['INDICADOR', 'VALOR']],
          body: [
            ['Total de ventas', `${ind.total_ventas || 0} ventas`],
            ['Ingresos totales', `S/ ${this.formatearMonto(ind.ingresos_totales || 0)}`],
            ['Promedio de venta', `S/ ${this.formatearMonto(ind.promedio_venta || 0)}`],
            ['Venta mayor', `S/ ${this.formatearMonto(ind.venta_mayor || 0)}`],
            ['Venta menor', `S/ ${this.formatearMonto(ind.venta_menor || 0)}`],
            ['Unidades vendidas', `${ind.unidades_vendidas || 0} unidades`],
            [
              'Producto más vendido',
              `${ind.producto_mas_vendido || 'Sin datos'} (${ind.cantidad_producto_mas_vendido || 0})`,
            ],
            [
              'Método de pago más usado',
              `${ind.metodo_pago_mas_usado || 'Sin datos'} (${ind.cantidad_metodo_pago || 0})`,
            ],
          ],
          theme: 'grid',
          styles: { lineColor, lineWidth: 0.1 },
          headStyles: { fillColor: headColor, textColor: headText, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: bodyText },
          columnStyles: {
            1: { halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: M, right: M, bottom: 14 },
          didDrawPage: onNuevaPagina,
        });
      }

      let fY = (doc as any).lastAutoTable?.finalY ?? Y;
      fY += 10;

      if (fY + 15 > pageH - 14) {
        doc.addPage();
        fY = 30;
      }

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(M, fY, pageW - M, fY);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(180, 180, 180);
      doc.text(
        'Documento generado automáticamente. Para mayor información, contactar al área de Administración de TechPerú S.A.C.',
        M,
        fY + 5,
        { maxWidth: pageW - M * 2 }
      );

      const totalPag = (doc as any).internal.pages.length - 1;

      for (let p = 1; p <= totalPag; p++) {
        doc.setPage(p);
        membrete(p, totalPag);
      }

      doc.save(`TechPeru_${titulo.replace(/ /g, '_')}_${this.fechaInicio}_al_${this.fechaFin}.pdf`);
    } catch (error) {
      console.error(error);
      this.mensaje = 'Error al generar el PDF. Revisa la consola del navegador.';
      this.cdr.detectChanges();
    }
  }
}