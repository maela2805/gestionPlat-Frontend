import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { BoutiqueOrderService } from '../../core/services/boutique-order.service';
import { ProductService } from '../../core/services/product.service';
import { TiersService } from '../../core/services/tiers.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { AuthService } from '../../core/services/auth.service';
import { PurchaseOrder, CreatePurchaseOrderRequest } from '../../core/models/purchase-order.model';
import { BoutiqueOrder, ApproveBoutiqueOrderRequest, CreateBoutiqueOrderRequest } from '../../core/models/boutique-order.model';
import { Product } from '../../core/models/product.model';
import { Tiers } from '../../core/models/tiers.model';
import { Boutique } from '../../core/models/boutique.model';

@Component({
  selector: 'app-purchase-orders',
  templateUrl: './purchase-orders.component.html',
  styleUrls: ['./purchase-orders.component.scss']
})
export class PurchaseOrdersComponent implements OnInit {
  activeTab = signal<'boutique' | 'fournisseur'>('boutique');

  // Signals pour Commandes Inter-Boutiques
  boutiqueOrders = signal<BoutiqueOrder[]>([]);
  boutiques = signal<Boutique[]>([]);
  selectedBoutiqueOrder = signal<BoutiqueOrder | null>(null);
  showBoutiqueCreateModal = signal<boolean>(false);
  showApproveModal = signal<boolean>(false);
  showBoutiqueDetailModal = signal<boolean>(false);
  showInvoiceBlPrintModal = signal<boolean>(false);

  // Signals pour Commandes Fournisseurs
  ordersList = signal<PurchaseOrder[]>([]);
  products = signal<Product[]>([]);
  suppliers = signal<Tiers[]>([]);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  searchTerm = signal<string>('');
  statusFilter = signal<string>('');

  showCreateModal = signal<boolean>(false);
  showDetailModal = signal<boolean>(false);
  selectedOrderDetail = signal<PurchaseOrder | null>(null);

  orderForm: FormGroup;
  boutiqueOrderForm: FormGroup;
  approveForm: FormGroup;

  constructor(
    private purchaseOrderService: PurchaseOrderService,
    private boutiqueOrderService: BoutiqueOrderService,
    private productService: ProductService,
    private tiersService: TiersService,
    private boutiqueService: BoutiqueService,
    public authService: AuthService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    // Formulaire Commande Fournisseur
    this.orderForm = this.fb.group({
      reference: [''],
      supplierId: [null, Validators.required],
      expectedDeliveryDate: [''],
      note: [''],
      items: this.fb.array([])
    });

    // Formulaire Commande Inter-Boutique
    this.boutiqueOrderForm = this.fb.group({
      boutiqueId: [null, Validators.required],
      note: [''],
      items: this.fb.array([])
    });

    // Formulaire d'approbation et données de livraison (Admin)
    this.approveForm = this.fb.group({
      deliveryDate: [new Date().toISOString().substring(0, 10), Validators.required],
      vehicleRegistration: ['', Validators.required],
      driverName: ['', Validators.required],
      driverPhone: ['', Validators.required],
      attachmentUrl: ['']
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab.set(params['tab']);
      }
      if (params['status']) {
        this.statusFilter.set(params['status']);
      }
    });

    this.loadBoutiqueOrders();
    this.loadPurchaseOrders();
    this.loadProducts();
    this.loadSuppliers();
    this.loadBoutiques();
  }

  setTab(tab: 'boutique' | 'fournisseur'): void {
    this.activeTab.set(tab);
    this.searchTerm.set('');
    this.statusFilter.set('');
  }

  // --- Chargement des données ---
  loadBoutiqueOrders(): void {
    this.isLoading.set(true);
    const currentUser = this.authService.currentUser();

    // Si l'utilisateur appartient à une boutique, charger uniquement ses commandes
    if (currentUser?.boutiqueId) {
      this.boutiqueOrderService.getOrdersByBoutique(currentUser.boutiqueId).subscribe({
        next: (data) => {
          this.boutiqueOrders.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    } else {
      this.boutiqueOrderService.getAllOrders().subscribe({
        next: (data) => {
          this.boutiqueOrders.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  loadPurchaseOrders(): void {
    this.purchaseOrderService.getAllPurchaseOrders().subscribe(data => this.ordersList.set(data));
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe(prods => this.products.set(prods));
  }

  loadSuppliers(): void {
    this.tiersService.getAllTiers('FOURNISSEUR').subscribe(data => this.suppliers.set(data));
  }

  loadBoutiques(): void {
    this.boutiqueService.getAllBoutiques().subscribe(b => this.boutiques.set(b));
  }

  // --- Computed Filters ---
  filteredBoutiqueOrders = computed(() => {
    let list = this.boutiqueOrders();
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(o =>
        o.orderNumber.toLowerCase().includes(search) ||
        (o.boutiqueName && o.boutiqueName.toLowerCase().includes(search)) ||
        (o.driverName && o.driverName.toLowerCase().includes(search))
      );
    }
    const status = this.statusFilter();
    if (status) {
      list = list.filter(o => o.status === status);
    }
    return list;
  });

  filteredPurchaseOrders = computed(() => {
    let list = this.ordersList();
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(o =>
        o.reference.toLowerCase().includes(search) ||
        (o.supplierName && o.supplierName.toLowerCase().includes(search))
      );
    }
    const status = this.statusFilter();
    if (status) {
      list = list.filter(o => o.status === status);
    }
    return list;
  });

  // --- Gestion du FormArray Commande Boutique ---
  get boutiqueItemsArray(): FormArray {
    return this.boutiqueOrderForm.get('items') as FormArray;
  }

  addBoutiqueItemRow(): void {
    const itemGroup = this.fb.group({
      productId: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
    this.boutiqueItemsArray.push(itemGroup);
  }

  removeBoutiqueItemRow(index: number): void {
    this.boutiqueItemsArray.removeAt(index);
  }

  isBoutiqueUser(): boolean {
    const user = this.authService.currentUser();
    return !!(user?.boutiqueId);
  }

  isGlobalAdmin(): boolean {
    const user = this.authService.currentUser();
    return !user?.boutiqueId;
  }

  openBoutiqueCreateModal(): void {
    const currentUser = this.authService.currentUser();
    this.boutiqueOrderForm.reset({
      boutiqueId: currentUser?.boutiqueId || null,
      note: ''
    });
    this.boutiqueItemsArray.clear();
    this.addBoutiqueItemRow();
    this.errorMessage.set(null);
    this.showBoutiqueCreateModal.set(true);
  }

  closeBoutiqueCreateModal(): void {
    this.showBoutiqueCreateModal.set(false);
  }

  submitBoutiqueOrder(): void {
    if (this.boutiqueItemsArray.length === 0) return;

    const currentUser = this.authService.currentUser();
    const formVal = this.boutiqueOrderForm.value;
    const boutiqueId = formVal.boutiqueId 
      ? Number(formVal.boutiqueId) 
      : (currentUser?.boutiqueId ? Number(currentUser.boutiqueId) : null);

    if (!boutiqueId) {
      this.errorMessage.set("Veuillez sélectionner une boutique valide.");
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const req: CreateBoutiqueOrderRequest = {
      boutiqueId: boutiqueId,
      note: formVal.note,
      items: formVal.items.map((i: any) => ({
        productId: Number(i.productId),
        quantity: Number(i.quantity)
      }))
    };

    this.boutiqueOrderService.createOrder(req).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeBoutiqueCreateModal();
        this.loadBoutiqueOrders();
      },
      error: (err) => {
        this.isSaving.set(false);
        const errorDetail = typeof err.error === 'string' ? err.error : (err.error?.message || err.message || 'Erreur lors de la création de la commande.');
        this.errorMessage.set(errorDetail);
      }
    });
  }

  // --- FormArray Articles Modifiables (Modifier & Approuver) ---
  get modifiedItemsArray(): FormArray {
    return this.approveForm.get('modifiedItems') as FormArray;
  }

  addModifiedItemRow(productId?: number, quantity: number = 1): void {
    const itemGroup = this.fb.group({
      productId: [productId || null, Validators.required],
      quantity: [quantity, [Validators.required, Validators.min(1)]]
    });
    this.modifiedItemsArray.push(itemGroup);
  }

  removeModifiedItemRow(index: number): void {
    this.modifiedItemsArray.removeAt(index);
  }

  // --- Approbation de la commande boutique avec infos de livraison ---
  openApproveModal(order: BoutiqueOrder, isModifyMode: boolean = false, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedBoutiqueOrder.set(order);
    
    this.modifiedItemsArray.clear();
    if (isModifyMode && order.items) {
      order.items.forEach(i => this.addModifiedItemRow(i.productId, i.quantity));
    }

    this.approveForm.reset({
      deliveryDate: new Date().toISOString().substring(0, 10),
      vehicleRegistration: '',
      driverName: '',
      driverPhone: '',
      attachmentUrl: '',
      isModifyMode: isModifyMode
    });

    this.showApproveModal.set(true);
  }

  closeApproveModal(): void {
    this.showApproveModal.set(false);
  }

  submitApproval(): void {
    const order = this.selectedBoutiqueOrder();
    if (!order || this.approveForm.invalid) return;

    this.isSaving.set(true);
    const formVal = this.approveForm.value;

    let modifiedItemsList = undefined;
    if (formVal.isModifyMode && this.modifiedItemsArray.length > 0) {
      modifiedItemsList = formVal.modifiedItems.map((i: any) => ({
        productId: Number(i.productId),
        quantity: Number(i.quantity)
      }));
    }

    const req: ApproveBoutiqueOrderRequest = {
      deliveryDate: formVal.deliveryDate ? new Date(formVal.deliveryDate).toISOString() : undefined,
      vehicleRegistration: formVal.vehicleRegistration,
      driverName: formVal.driverName,
      driverPhone: formVal.driverPhone,
      attachmentUrl: formVal.attachmentUrl,
      modifiedItems: modifiedItemsList
    };

    this.boutiqueOrderService.approveOrder(order.id, req).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeApproveModal();
        this.loadBoutiqueOrders();
        alert(`La commande ${order.orderNumber} a été approuvée avec succès et les informations de livraison enregistrées !`);
      },
      error: (err) => {
        this.isSaving.set(false);
        alert(err.error?.message || 'Erreur lors de l\'approbation de la commande.');
      }
    });
  }

  rejectBoutiqueOrder(order: BoutiqueOrder, event?: Event): void {
    if (event) event.stopPropagation();
    const reason = prompt(`Refuser la commande ${order.orderNumber} ? Entrez un motif :`);
    if (reason !== null) {
      this.boutiqueOrderService.rejectOrder(order.id, reason).subscribe({
        next: () => this.loadBoutiqueOrders(),
        error: (err) => alert(err.error?.message || 'Erreur lors du refus.')
      });
    }
  }

  cancelBoutiqueOrder(order: BoutiqueOrder, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Voulez-vous vraiment annuler la commande ${order.orderNumber} ?`)) {
      this.boutiqueOrderService.cancelOrder(order.id).subscribe({
        next: () => this.loadBoutiqueOrders(),
        error: (err) => alert(err.error?.message || 'Erreur lors de l\'annulation.')
      });
    }
  }

  deleteBoutiqueOrder(order: BoutiqueOrder, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Voulez-vous supprimer définitivement la commande ${order.orderNumber} ?`)) {
      this.boutiqueOrderService.deleteOrder(order.id).subscribe({
        next: () => this.loadBoutiqueOrders(),
        error: (err) => alert(err.error?.message || 'Impossible de supprimer cette commande.')
      });
    }
  }

  openBoutiqueOrderDetailModal(order: BoutiqueOrder): void {
    this.selectedBoutiqueOrder.set(order);
    this.showBoutiqueDetailModal.set(true);
  }

  closeBoutiqueDetailModal(): void {
    this.showBoutiqueDetailModal.set(false);
  }

  // --- Facture & Bon de Livraison (BL) PDF ---
  createAndPrintInvoice(order: BoutiqueOrder, event?: Event): void {
    if (event) event.stopPropagation();
    this.boutiqueOrderService.createInvoiceForOrder(order.id).subscribe({
      next: (inv) => {
        order.invoiceCreated = true;
        order.invoiceNumber = inv.invoiceNumber;
        this.selectedBoutiqueOrder.set(order);
        this.showInvoiceBlPrintModal.set(true);
      },
      error: (err) => {
        // Même si la facture existe déjà, on ouvre la vue d'impression
        this.selectedBoutiqueOrder.set(order);
        this.showInvoiceBlPrintModal.set(true);
      }
    });
  }

  closeInvoiceBlPrintModal(): void {
    this.showInvoiceBlPrintModal.set(false);
  }

  printDocument(): void {
    window.print();
  }

  // --- Support Commande Fournisseur d'Origine ---
  get itemsFormArray(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  addItemRow(): void {
    const itemGroup = this.fb.group({
      productId: [null],
      productName: [''],
      productReference: [''],
      categoryId: [null],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      quantityOrdered: [1, [Validators.required, Validators.min(1)]]
    });
    this.itemsFormArray.push(itemGroup);
  }

  removeItemRow(index: number): void {
    this.itemsFormArray.removeAt(index);
  }

  openCreateModal(): void {
    this.orderForm.reset({
      reference: '',
      supplierId: null,
      expectedDeliveryDate: '',
      note: ''
    });
    this.itemsFormArray.clear();
    this.addItemRow();
    this.errorMessage.set(null);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  openDetailModal(order: PurchaseOrder): void {
    this.selectedOrderDetail.set(order);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
  }

  submitOrder(): void {
    if (this.orderForm.invalid || this.itemsFormArray.length === 0) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const val = this.orderForm.value;
    const req: CreatePurchaseOrderRequest = {
      reference: val.reference || undefined,
      supplierId: Number(val.supplierId),
      expectedDeliveryDate: val.expectedDeliveryDate || undefined,
      note: val.note,
      items: val.items.map((i: any) => ({
        productId: i.productId ? Number(i.productId) : undefined,
        productName: i.productName || undefined,
        productReference: i.productReference || undefined,
        categoryId: i.categoryId ? Number(i.categoryId) : undefined,
        unitPrice: Number(i.unitPrice),
        quantityOrdered: Number(i.quantityOrdered)
      }))
    };

    this.purchaseOrderService.createPurchaseOrder(req).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeCreateModal();
        this.loadPurchaseOrders();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors de la création.');
      }
    });
  }

  validateOrder(order: PurchaseOrder, event?: Event): void {
    if (event) event.stopPropagation();
    this.purchaseOrderService.validatePurchaseOrder(order.id).subscribe({
      next: () => this.loadPurchaseOrders(),
      error: (err) => alert(err.error?.message || 'Erreur lors de la validation.')
    });
  }

  receiveDelivery(order: PurchaseOrder, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Réceptionner la livraison pour "${order.reference}" ?`)) {
      this.purchaseOrderService.receiveDelivery(order.id).subscribe({
        next: () => {
          this.loadPurchaseOrders();
          if (this.showDetailModal()) this.closeDetailModal();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors de la réception.')
      });
    }
  }

  cancelOrder(order: PurchaseOrder, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Annuler la commande "${order.reference}" ?`)) {
      this.purchaseOrderService.cancelPurchaseOrder(order.id).subscribe({
        next: () => this.loadPurchaseOrders(),
        error: (err) => alert(err.error?.message || 'Erreur lors de l\'annulation.')
      });
    }
  }
}
