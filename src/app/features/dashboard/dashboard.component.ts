import { Component, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { ProductService } from '../../core/services/product.service';
import { StockMovementService } from '../../core/services/stock-movement.service';
import { Product } from '../../core/models/product.model';
import { StockMovement } from '../../core/models/stock-movement.model';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  @ViewChild('barChart') barChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart') donutChartCanvas!: ElementRef<HTMLCanvasElement>;

  products = signal<Product[]>([]);
  criticalProducts = signal<Product[]>([]);
  movements = signal<StockMovement[]>([]);

  totalStockQuantity = signal<number>(0);

  private barChartInstance?: Chart;
  private donutChartInstance?: Chart;

  constructor(
    private productService: ProductService,
    private movementService: StockMovementService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.productService.getAllProducts().subscribe(prods => {
      this.products.set(prods);
      const totalQty = prods.reduce((sum, p) => sum + (p.stock || 0), 0);
      this.totalStockQuantity.set(totalQty);
      
      this.renderBarChart(prods);
    });

    this.productService.getCriticalStockProducts().subscribe(alerts => {
      this.criticalProducts.set(alerts);
    });

    this.movementService.getAllStockMovements().subscribe(movs => {
      this.movements.set(movs);
      this.renderDonutChart(movs);
    });
  }

  private renderBarChart(prods: Product[]): void {
    if (!this.barChartCanvas) return;
    
    const topProds = [...prods].sort((a, b) => b.stock - a.stock).slice(0, 5);
    const labels = topProds.map(p => p.name);
    const data = topProds.map(p => p.stock);

    if (this.barChartInstance) this.barChartInstance.destroy();

    this.barChartInstance = new Chart(this.barChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Quantité en stock',
          data,
          backgroundColor: '#FF6B35',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#8a8a9e' }, grid: { display: false } },
          y: { ticks: { color: '#8a8a9e' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  private renderDonutChart(movs: StockMovement[]): void {
    if (!this.donutChartCanvas) return;

    const entrees = movs.filter(m => m.type === 'ENTREE').length;
    const sorties = movs.filter(m => m.type === 'SORTIE').length;

    if (this.donutChartInstance) this.donutChartInstance.destroy();

    this.donutChartInstance = new Chart(this.donutChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Entrées (Réappro)', 'Sorties (Ventes/Pertes)'],
        datasets: [{
          data: [entrees || 1, sorties || 0],
          backgroundColor: ['#10B981', '#EF4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'bottom',
            labels: { color: '#ffffff', font: { size: 12 } }
          }
        }
      }
    });
  }
}
