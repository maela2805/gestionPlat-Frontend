import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private authService = inject(AuthService);
  user = this.authService.currentUser;
  isStockSubmenuOpen = signal<boolean>(true);

  toggleStockSubmenu(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isStockSubmenuOpen.update(v => !v);
  }

  getInitials(): string {
    const u = this.user();
    if (!u) return 'MK';
    if (u.firstName && u.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    return u.email.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
  }
}
