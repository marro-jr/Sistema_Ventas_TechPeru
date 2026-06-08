import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {

  nombre: string = '';
  rol: string = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
  this.nombre = localStorage.getItem('nombre') || 'Usuario';
  this.rol = localStorage.getItem('rol') || '';

  this.cdr.detectChanges();
}

  irRegistro(): void {
    this.router.navigate(['/registro']);
  }

  irMantenimiento(): void {
    this.router.navigate(['/mantenimiento']);
  }

  irClientes(): void {
    this.router.navigate(['/clientes']);
  }

  irVentas(): void {
    this.router.navigate(['/ventas']);
  }

  cerrarSesion(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}