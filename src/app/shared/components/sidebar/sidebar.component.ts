import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  public authService = inject(AuthService);
  user = this.authService.currentUser;
  isStockSubmenuOpen = signal<boolean>(true);
  isWarehouseSubmenuOpen = signal<boolean>(true);
  isPurchaseSubmenuOpen = signal<boolean>(false);

  toggleStockSubmenu(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isStockSubmenuOpen.update(v => !v);
  }

  toggleWarehouseSubmenu(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isWarehouseSubmenuOpen.update(v => !v);
  }

  togglePurchaseSubmenu(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isPurchaseSubmenuOpen.update(v => !v);
  }

  getInitials(): string {
    const u = this.user();
    if (!u) return 'GE';
    if (u.firstName && u.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    return u.email.substring(0, 2).toUpperCase();
  }

  canAccessUsers(): boolean {
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN']);
  }

  canAccessTiers(): boolean {
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
  }

  canAccessBoutiques(): boolean {
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
  }

  canAccessSales(): boolean {
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
  }

  logout(): void {
    this.authService.logout();
  }
}
