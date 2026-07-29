import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { AccountingService } from '../../core/services/accounting.service';
import { TiersService } from '../../core/services/tiers.service';
import {
  AccountingEntry,
  FinancialSummary,
  EntryType,
  AccountingCategory,
  CreateAccountingEntryRequest
} from '../../core/models/accounting.model';
import { PaymentMethod } from '../../core/models/invoice.model';
import { Tiers } from '../../core/models/tiers.model';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-accounting',
  templateUrl: './accounting.component.html',
  styleUrls: ['./accounting.component.scss']
})
export class AccountingComponent implements OnInit, AfterViewInit {

  @ViewChild('expensesChart') expensesChartCanvas!: ElementRef<HTMLCanvasElement>;
  chart: Chart | null = null;

  summary: FinancialSummary | null = null;
  entries: AccountingEntry[] = [];
  filteredEntries: AccountingEntry[] = [];
  tiersList: Tiers[] = [];

  loading: boolean = false;
  error: string | null = null;
  successMsg: string | null = null;

  selectedType: string = '';
  selectedCategory: string = '';
  searchQuery: string = '';

  // Manual entry modal
  showEntryModal: boolean = false;
  entryType: EntryType = EntryType.DEPENSE;
  entryCategory: AccountingCategory = AccountingCategory.AUTRES_CHARGES;
  entryAmount: number = 0;
  entryPaymentMethod: PaymentMethod = PaymentMethod.ESPECES;
  entryDescription: string = '';
  entryTiersId: number | undefined;

  EntryTypeEnum = EntryType;
  AccountingCategoryEnum = AccountingCategory;
  PaymentMethodEnum = PaymentMethod;

  categoriesList = [
    { key: AccountingCategory.VENTES_PLATS, label: 'Ventes & Prestations' },
    { key: AccountingCategory.ACHATS_MATIERES, label: 'Achats Matières Premières' },
    { key: AccountingCategory.LOYER, label: 'Loyer & Charges Locatives' },
    { key: AccountingCategory.ELECTRICITE_EAU, label: 'Électricité & Eau' },
    { key: AccountingCategory.SALAIRES, label: 'Salaires & Personnel' },
    { key: AccountingCategory.TRANSPORT_LIVRAISON, label: 'Transport & Logistique' },
    { key: AccountingCategory.AUTRES_CHARGES, label: 'Autres Charges / Dépenses' },
    { key: AccountingCategory.AUTRES_PRODUITS, label: 'Autres Produits / Recettes' }
  ];

  constructor(
    private accountingService: AccountingService,
    private tiersService: TiersService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.tiersService.getAllTiers().subscribe(tiers => this.tiersList = tiers);
  }

  ngAfterViewInit(): void {
    // Chart will render when summary data arrives
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.accountingService.getFinancialSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.renderChart();
      },
      error: () => this.error = 'Erreur lors du chargement du rapport financier.'
    });

    this.accountingService.getAllEntries().subscribe({
      next: (entries) => {
        this.entries = entries;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement du journal comptable.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.filteredEntries = this.entries.filter(e => {
      const matchType = !this.selectedType || e.type === this.selectedType;
      const matchCat = !this.selectedCategory || e.category === this.selectedCategory;
      const q = this.searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.entryCode && e.entryCode.toLowerCase().includes(q)) ||
        (e.tiersName && e.tiersName.toLowerCase().includes(q));

      return matchType && matchCat && matchQuery;
    });
  }

  renderChart(): void {
    if (!this.summary || !this.expensesChartCanvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const categories = Object.keys(this.summary.expensesByCategory || {});
    const amounts = Object.values(this.summary.expensesByCategory || {});

    const labels = categories.map(cat => {
      const found = this.categoriesList.find(c => c.key === cat);
      return found ? found.label : cat;
    });

    const ctx = this.expensesChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length > 0 ? labels : ['Aucune dépense'],
        datasets: [{
          data: amounts.length > 0 ? amounts : [1],
          backgroundColor: [
            '#ff4d4f', '#ff7a45', '#ffa940', '#ffec3d',
            '#73d13d', '#36cfc9', '#4096ff', '#9254de'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }

  openEntryModal(type: EntryType = EntryType.DEPENSE): void {
    this.entryType = type;
    this.entryCategory = type === EntryType.DEPENSE ? AccountingCategory.AUTRES_CHARGES : AccountingCategory.AUTRES_PRODUITS;
    this.entryAmount = 0;
    this.entryPaymentMethod = PaymentMethod.ESPECES;
    this.entryDescription = '';
    this.entryTiersId = undefined;
    this.showEntryModal = true;
  }

  closeEntryModal(): void {
    this.showEntryModal = false;
  }

  saveManualEntry(): void {
    if (this.entryAmount <= 0 || !this.entryDescription) {
      alert('Veuillez saisir un montant positif et une description.');
      return;
    }

    const req: CreateAccountingEntryRequest = {
      type: this.entryType,
      category: this.entryCategory,
      amount: this.entryAmount,
      paymentMethod: this.entryPaymentMethod,
      description: this.entryDescription,
      tiersId: this.entryTiersId
    };

    this.accountingService.createManualEntry(req).subscribe({
      next: () => {
        this.showSuccess('Écriture comptable enregistrée avec succès.');
        this.closeEntryModal();
        this.loadData();
      },
      error: () => alert('Erreur lors de l\'enregistrement de l\'écriture comptable.')
    });
  }

  showSuccess(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => this.successMsg = null, 4000);
  }

  getCategoryLabel(category: string): string {
    const found = this.categoriesList.find(c => c.key === category);
    return found ? found.label : category;
  }
}
