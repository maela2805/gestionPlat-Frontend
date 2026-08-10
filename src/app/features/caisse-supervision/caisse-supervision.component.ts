import { Component, OnInit, inject } from '@angular/core';
import { CashSessionService } from '../../core/services/cash-session.service';
import { PosSaleService } from '../../core/services/pos-sale.service';
import { BoutiqueService } from '../../core/services/boutique.service';

import { CashSession } from '../../core/models/cash-session.model';
import { PosSale } from '../../core/models/pos-sale.model';
import { Boutique } from '../../core/models/boutique.model';

@Component({
  selector: 'app-caisse-supervision',
  templateUrl: './caisse-supervision.component.html',
  styleUrls: ['./caisse-supervision.component.scss']
})
export class CaisseSupervisionComponent implements OnInit {
  private cashSessionService = inject(CashSessionService);
  private posSaleService = inject(PosSaleService);
  private boutiqueService = inject(BoutiqueService);

  sessions: CashSession[] = [];
  sales: PosSale[] = [];
  boutiques: Boutique[] = [];

  selectedBoutiqueId: number | null = null;
  activeTab: 'sessions' | 'sales' = 'sessions';
  statusFilter: 'ALL' | 'OPEN' | 'CLOSED' = 'ALL';

  selectedSessionDetails: CashSession | null = null;
  showDetailsModal = false;

  selectedSaleDetails: PosSale | null = null;
  showSaleDetailsModal = false;

  loading = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;

  ngOnInit(): void {
    this.loadBoutiques();
    this.loadSessions();
    this.loadSales();
  }

  loadBoutiques(): void {
    this.boutiqueService.getAllBoutiques().subscribe({
      next: (data) => this.boutiques = data,
      error: (err) => console.error(err)
    });
  }

  loadSessions(): void {
    this.loading = true;
    this.cashSessionService.getAllSessions().subscribe({
      next: (data) => {
        this.loading = false;
        this.sessions = data;
      },
      error: (err) => {
        this.loading = false;
        this.showError('Erreur de chargement des sessions de caisse');
      }
    });
  }

  loadSales(): void {
    this.posSaleService.getAllPosSales().subscribe({
      next: (data) => this.sales = data,
      error: (err) => console.error(err)
    });
  }

  sessionsCurrentPage: number = 1;
  sessionsItemsPerPage: number = 5;

  get filteredSessions(): CashSession[] {
    return this.sessions.filter(s => {
      const matchesBoutique = !this.selectedBoutiqueId || 
                              String(this.selectedBoutiqueId) === 'null' || 
                              Number(s.boutiqueId) === Number(this.selectedBoutiqueId);
      const matchesStatus = this.statusFilter === 'ALL' || s.status === this.statusFilter;
      return matchesBoutique && matchesStatus;
    });
  }

  get paginatedSessions(): CashSession[] {
    const start = (this.sessionsCurrentPage - 1) * this.sessionsItemsPerPage;
    return this.filteredSessions.slice(start, start + this.sessionsItemsPerPage);
  }

  get sessionsTotalPages(): number {
    return Math.ceil(this.filteredSessions.length / this.sessionsItemsPerPage) || 1;
  }

  sessionsNextPage(): void {
    if (this.sessionsCurrentPage < this.sessionsTotalPages) this.sessionsCurrentPage++;
  }

  sessionsPrevPage(): void {
    if (this.sessionsCurrentPage > 1) this.sessionsCurrentPage--;
  }

  salesCurrentPage: number = 1;
  salesItemsPerPage: number = 5;

  get filteredSales(): PosSale[] {
    return this.sales.filter(s => {
      return !this.selectedBoutiqueId || 
             String(this.selectedBoutiqueId) === 'null' || 
             Number(s.boutiqueId) === Number(this.selectedBoutiqueId);
    });
  }

  get paginatedSales(): PosSale[] {
    const start = (this.salesCurrentPage - 1) * this.salesItemsPerPage;
    return this.filteredSales.slice(start, start + this.salesItemsPerPage);
  }

  get salesTotalPages(): number {
    return Math.ceil(this.filteredSales.length / this.salesItemsPerPage) || 1;
  }

  salesNextPage(): void {
    if (this.salesCurrentPage < this.salesTotalPages) this.salesCurrentPage++;
  }

  salesPrevPage(): void {
    if (this.salesCurrentPage > 1) this.salesCurrentPage--;
  }

  // KPIs (Calculés dynamiquement sur les sessions filtrées)
  get activeSessionsCount(): number {
    return this.filteredSessions.filter(s => s.status === 'OPEN').length;
  }

  get totalCashToday(): number {
    return this.filteredSessions.reduce((sum, s) => sum + (s.totalSalesCash || 0), 0);
  }

  get totalMobileMoneyToday(): number {
    return this.filteredSessions.reduce((sum, s) => sum + (s.totalSalesMobileMoney || 0), 0);
  }

  get totalVariances(): number {
    return this.filteredSessions.reduce((sum, s) => sum + (s.cashDifference || 0), 0);
  }

  openSessionDetails(session: CashSession): void {
    this.cashSessionService.getSessionById(session.id).subscribe({
      next: (full) => {
        this.selectedSessionDetails = full;
        this.showDetailsModal = true;
      },
      error: (err) => this.showError('Impossible de charger les détails de la session')
    });
  }

  openSaleDetails(sale: PosSale): void {
    this.selectedSaleDetails = sale;
    this.showSaleDetailsModal = true;
  }

  cancelSale(saleId: number): void {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette vente ? Le stock sera réintégré.')) return;

    this.posSaleService.cancelPosSale(saleId).subscribe({
      next: () => {
        this.showSuccess('Vente annulée avec succès');
        this.showSaleDetailsModal = false;
        this.loadSales();
        this.loadSessions();
      },
      error: (err) => this.showError(err.error?.message || 'Erreur lors de l\'annulation')
    });
  }

  showError(msg: string): void {
    this.errorMsg = msg;
    setTimeout(() => this.errorMsg = null, 4000);
  }

  showSuccess(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => this.successMsg = null, 3000);
  }
}
