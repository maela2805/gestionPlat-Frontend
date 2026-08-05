import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { BoutiqueOrderService } from '../../core/services/boutique-order.service';
import { ProductService } from '../../core/services/product.service';
import { TiersService } from '../../core/services/tiers.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { AuthService } from '../../core/services/auth.service';
import { InvoiceService } from '../../core/services/invoice.service';
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

  // --- Signaux pour la modale BL ---
  showBlFormStep = signal<boolean>(true); // true = formulaire, false = aperçu
  blDriverName = signal<string>('');
  blDriverPhone = signal<string>('');
  blVehicleRegistration = signal<string>('');
  blDeliveryDate = signal<string>(new Date().toISOString().substring(0, 10));
  isSavingBl = signal<boolean>(false);

  constructor(
    private purchaseOrderService: PurchaseOrderService,
    private boutiqueOrderService: BoutiqueOrderService,
    private productService: ProductService,
    private tiersService: TiersService,
    private boutiqueService: BoutiqueService,
    public authService: AuthService,
    private invoiceService: InvoiceService,
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
      deliveryDate: [new Date().toISOString().substring(0, 10)],
      vehicleRegistration: [''],
      driverName: [''],
      driverPhone: [''],
      attachmentUrl: [''],
      isModifyMode: [false],
      modifiedItems: this.fb.array([])
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
    if (user?.boutiqueId) return true;
    const role = (user?.roleName || '').toUpperCase();
    return role.includes('EMPLOYEE') || role.includes('EMPLOYE') || role.includes('CAISSIER') || role.includes('GERANT') || role.includes('BOUTIQUE');
  }

  getAssignedBoutiqueName(): string {
    const currentUser = this.authService.currentUser();
    if (currentUser?.boutiqueName) return currentUser.boutiqueName;
    if (currentUser?.boutiqueId) {
      const b = this.boutiques().find(x => x.id === currentUser.boutiqueId);
      if (b) return b.name;
    }
    const formBoutiqueId = this.boutiqueOrderForm.get('boutiqueId')?.value;
    if (formBoutiqueId) {
      const b = this.boutiques().find(x => x.id == formBoutiqueId);
      if (b) return b.name;
    }
    return 'Votre Boutique';
  }

  isGlobalAdmin(): boolean {
    const user = this.authService.currentUser();
    return !user?.boutiqueId;
  }

  openBoutiqueCreateModal(): void {
    const currentUser = this.authService.currentUser();
    let targetBoutiqueId = currentUser?.boutiqueId || null;
    if (!targetBoutiqueId && this.boutiques().length > 0) {
      targetBoutiqueId = this.boutiques()[0].id;
    }

    this.boutiqueOrderForm.reset({
      boutiqueId: targetBoutiqueId,
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
    let boutiqueId = formVal.boutiqueId 
      ? Number(formVal.boutiqueId) 
      : (currentUser?.boutiqueId ? Number(currentUser.boutiqueId) : null);

    if (!boutiqueId && this.boutiques().length > 0) {
      boutiqueId = this.boutiques()[0].id;
    }

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
    return (this.approveForm?.get('modifiedItems') as FormArray);
  }

  addModifiedItemRow(productId?: number, quantity: number = 1): void {
    const itemGroup = this.fb.group({
      productId: [productId || null, Validators.required],
      quantity: [quantity, [Validators.required, Validators.min(1)]]
    });
    if (this.modifiedItemsArray) {
      this.modifiedItemsArray.push(itemGroup);
    }
  }

  removeModifiedItemRow(index: number): void {
    if (this.modifiedItemsArray) {
      this.modifiedItemsArray.removeAt(index);
    }
  }

  selectedAttachmentFileName = signal<string | null>(null);

  onAttachmentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedAttachmentFileName.set(file.name);
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.approveForm.patchValue({
          attachmentUrl: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeAttachmentFile(): void {
    this.selectedAttachmentFileName.set(null);
    this.approveForm.patchValue({ attachmentUrl: '' });
  }

  openApproveModal(order: BoutiqueOrder, isModifyMode: boolean = false, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.selectedBoutiqueOrder.set(order);
    this.selectedAttachmentFileName.set(null);
    
    if (this.modifiedItemsArray) {
      this.modifiedItemsArray.clear();
    }

    if (isModifyMode && order.items) {
      order.items.forEach(i => this.addModifiedItemRow(i.productId, i.quantity));
    }

    this.approveForm.patchValue({
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
        this.boutiqueOrderService.createInvoiceForOrder(order.id).subscribe({
          next: () => {
            this.isSaving.set(false);
            this.closeApproveModal();
            this.loadBoutiqueOrders();
            alert(`La commande N° ${order.orderNumber} a été approuvée et sa facture de cession a été créée avec succès !`);
          },
          error: () => {
            this.isSaving.set(false);
            this.closeApproveModal();
            this.loadBoutiqueOrders();
            alert(`La commande N° ${order.orderNumber} a été approuvée avec succès !`);
          }
        });
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = typeof err.error === 'string' ? err.error : (err.error?.message || err.message || 'Erreur lors de l\'approbation de la commande.');
        alert(msg);
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

  confirmDeliveryBoutiqueOrder(order: BoutiqueOrder, event?: Event): void {
    if (event) event.stopPropagation();
    if (!confirm(`Confirmer la réception de la livraison pour la commande N° ${order.orderNumber} ?`)) return;

    this.boutiqueOrderService.confirmDelivery(order.id).subscribe({
      next: (updated) => {
        alert(`Livraison confirmée pour la commande ${updated.orderNumber}.`);
        this.loadBoutiqueOrders();
      },
      error: (err) => alert(err.error?.message || 'Erreur lors de la confirmation de livraison.')
    });
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

  createdInvoiceSuccess = signal<{ invoiceNumber: string; orderNumber: string; totalAmount?: number } | null>(null);

  // --- Création de Facture / Ouverture modale BL ---
  createInvoiceForOrder(order: BoutiqueOrder, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Si la facture est déjà créée, ouvrir directement la modale
    if (order.invoiceCreated) {
      this.selectedBoutiqueOrder.set(order);
      // Pré-remplir les champs BL avec les valeurs existantes
      this.blDriverName.set(order.driverName || '');
      this.blDriverPhone.set(order.driverPhone || '');
      this.blVehicleRegistration.set(order.vehicleRegistration || '');
      this.blDeliveryDate.set(order.deliveryDate ? new Date(order.deliveryDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));
      // Si les détails BL ont déjà été renseignés → aperçu direct
      const blDetailsSaved = !!(order.driverName || order.vehicleRegistration);
      this.showBlFormStep.set(!blDetailsSaved);
      this.showInvoiceBlPrintModal.set(true);
      return;
    }

    // Sinon créer la facture puis ouvrir le formulaire BL
    this.boutiqueOrderService.createInvoiceForOrder(order.id).subscribe({
      next: (inv) => {
        order.invoiceCreated = true;
        order.invoiceId = inv.id;
        order.invoiceNumber = inv.invoiceNumber;
        this.selectedBoutiqueOrder.set(order);
        // Réinitialiser le formulaire BL
        this.blDriverName.set('');
        this.blDriverPhone.set('');
        this.blVehicleRegistration.set('');
        this.blDeliveryDate.set(new Date().toISOString().substring(0, 10));
        this.showBlFormStep.set(true); // Afficher le formulaire en 1ère fois
        this.showInvoiceBlPrintModal.set(true);
      },
      error: () => {
        this.selectedBoutiqueOrder.set(order);
        this.showBlFormStep.set(true);
        this.showInvoiceBlPrintModal.set(true);
      }
    });
  }

  // --- Enregistrement des détails BL et basculement vers l'aperçu ---
  saveBLDetails(): void {
    const order = this.selectedBoutiqueOrder();
    if (!order) return;

    this.isSavingBl.set(true);
    const driverName = this.blDriverName();
    const driverPhone = this.blDriverPhone();
    const vehicleRegistration = this.blVehicleRegistration();
    const deliveryDate = this.blDeliveryDate();

    // Mettre à jour les infos de livraison sur la commande boutique dans la base de données
    this.boutiqueOrderService.updateDeliveryInfo(order.id, {
      driverName,
      driverPhone,
      vehicleRegistration,
      deliveryDate
    }).subscribe({
      next: (updatedOrder) => {
        // Également mettre à jour la facture si invoiceId existe
        if (order.invoiceId) {
          this.invoiceService.updateInvoice(order.invoiceId, {
            driverName,
            driverPhone,
            vehicleRegistration,
            deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined
          } as any).subscribe({ error: () => {} });
        }

        // Mettre à jour l'objet order localement pour débloquer l'affichage immédiatement
        order.driverName = driverName;
        order.driverPhone = driverPhone;
        order.vehicleRegistration = vehicleRegistration;
        order.deliveryDate = deliveryDate;
        this.selectedBoutiqueOrder.set({ ...order });

        // Mettre à jour la liste dans le signal
        this.boutiqueOrders.update(orders =>
          orders.map(o => o.id === order.id ? { ...o, driverName, driverPhone, vehicleRegistration, deliveryDate } : o)
        );

        this.isSavingBl.set(false);
        // Basculer vers l'aperçu du BL
        this.showBlFormStep.set(false);

        // Recharger la liste depuis le backend
        this.loadBoutiqueOrders();
      },
      error: (err) => {
        this.isSavingBl.set(false);
        alert(err.error?.message || 'Erreur lors de la sauvegarde des détails du BL. Veuillez réessayer.');
      }
    });
  }

  closeCreatedInvoiceSuccessModal(): void {
    this.createdInvoiceSuccess.set(null);
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
