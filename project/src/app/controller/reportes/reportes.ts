import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportesService } from '../../services/reportes.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  rol: string = '';
  reporteSeleccionado: string = '';
  periodo: number = 7; // Por defecto 7 días
  
  resultadosEstadisticas: any = null;
  resultadosIngresos: any = null;
  resultadosEliminaciones: any[] = [];
  
  cargando: boolean = false;
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
  }

  volver(): void {
    this.router.navigate(['/inicio']);
  }

  seleccionarReporte(tipo: string): void {
    this.reporteSeleccionado = tipo;
    this.limpiarResultados();
    this.generarPrevisualizacion();
  }

  limpiarResultados(): void {
    this.resultadosEstadisticas = null;
    this.resultadosIngresos = null;
    this.resultadosEliminaciones = [];
    this.mensaje = '';
  }

  generarPrevisualizacion(): void {
    this.cargando = true;
    if (this.reporteSeleccionado === 'estadisticas') {
      this.reportesService.obtenerEstadisticasVentas(this.periodo).subscribe({
        next: (data) => {
          this.resultadosEstadisticas = data;
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al obtener estadísticas';
          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
    } else if (this.reporteSeleccionado === 'ingresos') {
      this.reportesService.obtenerIngresos(this.periodo).subscribe({
        next: (data) => {
          this.resultadosIngresos = data;
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al obtener ingresos';
          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
    } else if (this.reporteSeleccionado === 'eliminaciones') {
      this.reportesService.obtenerEliminaciones(this.periodo).subscribe({
        next: (data) => {
          this.resultadosEliminaciones = data;
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.mensaje = err.error?.error || 'Error al obtener eliminaciones (posiblemente la tabla no exista)';
          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  cambiarPeriodo(): void {
    if (this.reporteSeleccionado) {
      this.generarPrevisualizacion();
    }
  }

  async descargarPDF(): Promise<void> {
    try {
      // Importación dinámica de jspdf y autotable
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF();
      const fechaActual = new Date().toLocaleDateString();

      doc.setFontSize(18);
      doc.text('Reporte Administrativo - TechPeru', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Fecha de generación: ${fechaActual}`, 14, 30);
      doc.text(`Periodo analizado: Ultimos ${this.periodo} dias`, 14, 36);

      if (this.reporteSeleccionado === 'estadisticas' && this.resultadosEstadisticas) {
        doc.text('Tipo: Estadisticas de Ventas (Max, Min, Promedio)', 14, 42);
        (doc as any).autoTable({
          startY: 50,
          head: [['Venta Maxima', 'Venta Minima', 'Venta Promedio', 'Total Ventas']],
          body: [[
            `S/ ${this.resultadosEstadisticas.venta_maxima || 0}`,
            `S/ ${this.resultadosEstadisticas.venta_minima || 0}`,
            `S/ ${Number(this.resultadosEstadisticas.venta_promedio || 0).toFixed(2)}`,
            this.resultadosEstadisticas.total_ventas || 0
          ]],
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85] }
        });
      } else if (this.reporteSeleccionado === 'ingresos' && this.resultadosIngresos) {
        doc.text('Tipo: Reporte de Ingresos Totales', 14, 42);
        (doc as any).autoTable({
          startY: 50,
          head: [['Ingresos Totales (SUM)', 'Cantidad de Ventas (COUNT)']],
          body: [[
            `S/ ${this.resultadosIngresos.ingresos_totales || 0}`,
            this.resultadosIngresos.cantidad_ventas || 0
          ]],
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85] }
        });
      } else if (this.reporteSeleccionado === 'eliminaciones' && this.resultadosEliminaciones) {
        doc.text('Tipo: Historial de Eliminaciones Fisicas', 14, 42);
        const body = this.resultadosEliminaciones.map(e => [
          e.id_historial || '-', 
          e.tabla_afectada || '-', 
          e.id_registro_eliminado || '-', 
          e.fecha_eliminacion ? new Date(e.fecha_eliminacion).toLocaleString() : '-'
        ]);
        
        if (body.length === 0) {
           body.push(['No hay datos', '-', '-', '-']);
        }

        (doc as any).autoTable({
          startY: 50,
          head: [['ID Historial', 'Tabla Afectada', 'ID Eliminado', 'Fecha de Eliminacion']],
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85] }
        });
      }

      doc.save(`reporte_${this.reporteSeleccionado}_${fechaActual}.pdf`);

    } catch (error) {
      console.error(error);
      this.mensaje = 'Error: Debes ejecutar en la terminal: npm install jspdf jspdf-autotable';
      this.cdr.detectChanges();
    }
  }
}
