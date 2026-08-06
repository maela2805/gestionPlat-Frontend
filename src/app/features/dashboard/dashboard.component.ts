import { Component, OnInit, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { ProductService } from '../../core/services/product.service';
import { StockMovementService } from '../../core/services/stock-movement.service';
import { CashSessionService } from '../../core/services/cash-session.service';
import { FundTransferService } from '../../core/services/fund-transfer.service';
import { AuthService } from '../../core/services/auth.service';
import { BoutiqueService } from '../../core/services/boutique.service';

import { Product } from '../../core/models/product.model';
import { StockMovement } from '../../core/models/stock-movement.model';
import { CashSession } from '../../core/models/cash-session.model';
import { BoutiqueWallet } from '../../core/models/fund-transfer.model';
import { Boutique } from '../../core/models/boutique.model';
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
  currentSession = signal<CashSession | null>(null);
  walletSummary = signal<BoutiqueWallet | null>(null);

  totalStockQuantity = signal<number>(0);

  private barChartInstance?: Chart;
  private donutChartInstance?: Chart;

  private productService = inject(ProductService);
  private movementService = inject(StockMovementService);
  private cashSessionService = inject(CashSessionService);
  private fundTransferService = inject(FundTransferService);
  public authService = inject(AuthService);
  private boutiqueService = inject(BoutiqueService);

  boutiquesList = signal<Boutique[]>([]);
  selectedBoutiqueId = signal<number | null>(null);

  get isAdmin(): boolean {
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN']);
  }

  transfers = signal<any[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
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

    this.fundTransferService.getAllTransfers().subscribe(trfs => {
      this.transfers.set(trfs ? trfs.slice(0, 5) : []);
    });

    this.boutiqueService.getAllBoutiques().subscribe(boutiques => {
      this.boutiquesList.set(boutiques);
      const user = this.authService.currentUser();
      const userBoutiqueId = user?.boutiqueId;

      if (!this.isAdmin && userBoutiqueId) {
        this.selectedBoutiqueId.set(userBoutiqueId);
        this.loadFinancialData(userBoutiqueId);
      } else {
        // Admin vue globale (null)
        this.selectedBoutiqueId.set(null);
        this.loadFinancialData(null);
      }
    });
  }

  onSelectChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    const bId = (val === 'ALL' || !val) ? null : Number(val);
    this.selectedBoutiqueId.set(bId);
    this.loadFinancialData(bId);
  }

  onBoutiqueChange(bId: number | null): void {
    this.selectedBoutiqueId.set(bId);
    this.loadFinancialData(bId);
  }

  private loadFinancialData(boutiqueId: number | null): void {
    if (boutiqueId) {
      this.cashSessionService.getCurrentBoutiqueSession(boutiqueId).subscribe((session: CashSession | null) => {
        this.currentSession.set(session);
      });
    } else {
      this.cashSessionService.getCurrentUserSession().subscribe((session: CashSession | null) => {
        this.currentSession.set(session);
      });
    }

    this.fundTransferService.getBoutiqueWallet(boutiqueId).subscribe((wallet: BoutiqueWallet) => {
      this.walletSummary.set(wallet);
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
