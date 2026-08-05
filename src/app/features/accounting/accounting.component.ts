import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { AccountingService } from '../../core/services/accounting.service';
import { TiersService } from '../../core/services/tiers.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { FundTransferService } from '../../core/services/fund-transfer.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';
import { Boutique } from '../../core/models/boutique.model';
import { BoutiqueWallet, FundTransfer, FundTransferStatus } from '../../core/models/fund-transfer.model';
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
  boutiquesList: Boutique[] = [];
  walletSummary: BoutiqueWallet | null = null;
  transfersList: FundTransfer[] = [];
  filteredTransfers: FundTransfer[] = [];

  loading: boolean = false;
  error: string | null = null;
  successMsg: string | null = null;

  activeTab: 'journal' | 'transfers' = 'journal';

  selectedBoutiqueId: number | null = null;
  selectedType: string = '';
  selectedCategory: string = '';
  selectedTransferStatus: string = '';
  searchQuery: string = '';

  // Manual entry modal
  showEntryModal: boolean = false;
  entryType: EntryType = EntryType.DEPENSE;
  entryCategory: AccountingCategory = AccountingCategory.AUTRES_CHARGES;
  entryAmount: number = 0;
  entryPaymentMethod: PaymentMethod = PaymentMethod.ESPECES;
  entryDescription: string = '';
  entryTiersId: number | undefined;

  // Fund Transfer Modal
  showTransferModal: boolean = false;
  transferBoutiqueId: number | null = null;
  transferAmount: number = 0;
  transferPaymentMethod: string = 'WAVE';
  transferProofUrl: string = '';
  transferNotes: string = '';
  isUploading: boolean = false;

  // Proof image preview modal
  showProofModal: boolean = false;
  selectedProofUrl: string = '';

  // Reject transfer modal
  showRejectModal: boolean = false;
  rejectTransferId: number | null = null;
  rejectReason: string = '';

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
    private tiersService: TiersService,
    private boutiqueService: BoutiqueService,
    private fundTransferService: FundTransferService,
    public authService: AuthService,
    private uploadService: UploadService
  ) {}

  ngOnInit(): void {
    this.loadBoutiques();
    this.loadData();
    this.tiersService.getAllTiers().subscribe(tiers => this.tiersList = tiers);
  }

  ngAfterViewInit(): void {
    // Chart rendering
  }

  get isAdmin(): boolean {
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
  }

  get userBoutiqueId(): number | null {
    const user = this.authService.currentUser();
    return user && user.boutiqueId ? user.boutiqueId : null;
  }

  get isBoutiqueRestricted(): boolean {
    return !this.isAdmin && this.userBoutiqueId !== null;
  }

  loadBoutiques(): void {
    this.boutiqueService.getAllBoutiques().subscribe({
      next: (boutiques) => {
        this.boutiquesList = boutiques;
        if (this.isBoutiqueRestricted && this.userBoutiqueId) {
          this.selectedBoutiqueId = this.userBoutiqueId;
        } else if (boutiques.length > 0 && !this.selectedBoutiqueId) {
          this.selectedBoutiqueId = boutiques[0].id;
        }
        this.loadWalletAndTransfers();
      },
      error: (err) => console.error(err)
    });
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

  loadWalletAndTransfers(): void {
    if (this.selectedBoutiqueId) {
      this.fundTransferService.getBoutiqueWallet(this.selectedBoutiqueId).subscribe({
        next: (wallet) => this.walletSummary = wallet,
        error: (err) => console.error(err)
      });
    }

    const bId = this.selectedBoutiqueId || undefined;
    this.fundTransferService.getAllTransfers(bId).subscribe({
      next: (transfers) => {
        this.transfersList = transfers;
        this.applyTransferFilter();
      },
      error: (err) => console.error(err)
    });
  }

  onBoutiqueChange(): void {
    this.loadWalletAndTransfers();
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

  applyTransferFilter(): void {
    this.filteredTransfers = this.transfersList.filter(t => {
      const matchStatus = !this.selectedTransferStatus || t.status === this.selectedTransferStatus;
      const q = this.searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (t.reference && t.reference.toLowerCase().includes(q)) ||
        (t.boutiqueName && t.boutiqueName.toLowerCase().includes(q)) ||
        (t.userEmail && t.userEmail.toLowerCase().includes(q));

      return matchStatus && matchQuery;
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

  // --- MANUAL ENTRY MODAL ---
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

  // --- FUND TRANSFER MODAL ---
  openTransferModal(): void {
    this.transferBoutiqueId = this.selectedBoutiqueId || (this.boutiquesList.length > 0 ? this.boutiquesList[0].id : null);
    this.transferAmount = 0;
    this.transferPaymentMethod = 'WAVE';
    this.transferProofUrl = '';
    this.transferNotes = '';
    this.showTransferModal = true;
  }

  closeTransferModal(): void {
    this.showTransferModal = false;
  }

  onProofFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.isUploading = true;
      this.uploadService.uploadMedia(file).subscribe({
        next: (res: { url: string }) => {
          this.transferProofUrl = res.url;
          this.isUploading = false;
        },
        error: (err: any) => {
          console.error(err);
          alert('Erreur lors du téléversement du justificatif.');
          this.isUploading = false;
        }
      });
    }
  }

  submitTransfer(): void {
    if (this.transferAmount <= 0) {
      alert('Veuillez saisir un montant de versement valide.');
      return;
    }

    this.fundTransferService.createTransfer({
      boutiqueId: this.transferBoutiqueId || undefined,
      amount: this.transferAmount,
      paymentMethod: this.transferPaymentMethod,
      proofUrl: this.transferProofUrl,
      notes: this.transferNotes
    }).subscribe({
      next: () => {
        this.showSuccess('Versement transmis au dépôt avec succès ! En attente de validation.');
        this.closeTransferModal();
        this.loadWalletAndTransfers();
      },
      error: (err) => alert(err?.error?.message || 'Erreur lors du versement.')
    });
  }

  // --- APPROVE / REJECT / CANCEL TRANSFERS ---
  approveTransfer(t: FundTransfer): void {
    if (confirm(`Confirmez-vous la validation du versement de ${t.amount.toLocaleString()} FCFA (${t.boutiqueName}) ?`)) {
      this.fundTransferService.approveTransfer(t.id).subscribe({
        next: () => {
          this.showSuccess('Versement validé avec succès ! Solde crédité et écriture comptable générée.');
          this.loadWalletAndTransfers();
          this.loadData();
        },
        error: (err) => alert(err?.error?.message || 'Erreur lors de l\'approbation.')
      });
    }
  }

  openRejectModal(t: FundTransfer): void {
    this.rejectTransferId = t.id;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectTransferId = null;
  }

  submitReject(): void {
    if (!this.rejectTransferId) return;
    this.fundTransferService.rejectTransfer(this.rejectTransferId, this.rejectReason).subscribe({
      next: () => {
        this.showSuccess('Versement rejeté.');
        this.closeRejectModal();
        this.loadWalletAndTransfers();
      },
      error: (err) => alert(err?.error?.message || 'Erreur lors du rejet.')
    });
  }

  openProofModal(url: string): void {
    this.selectedProofUrl = url;
    this.showProofModal = true;
  }

  closeProofModal(): void {
    this.showProofModal = false;
    this.selectedProofUrl = '';
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
