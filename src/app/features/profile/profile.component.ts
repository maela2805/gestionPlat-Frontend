import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  private authService = inject(AuthService);
  user = this.authService.currentUser;

  getInitials(): string {
    const u = this.user();
    if (!u) return 'KT';
    if (u.firstName && u.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    return u.email ? u.email.substring(0, 2).toUpperCase() : 'KT';
  }

  getRoleLabel(): string {
    const r = this.user()?.roleName || this.user()?.role?.name || (typeof this.user()?.role === 'string' ? this.user()?.role : '') || 'SUPER_ADMIN';
    const roleStr = String(r).toUpperCase();
    if (roleStr.includes('SUPER') || roleStr.includes('SUPER_ADMIN')) return 'Super Administrateur';
    if (roleStr.includes('ADMIN')) return 'Administrateur Système';
    if (roleStr.includes('MANAGER')) return 'Gestionnaire de Stock';
    if (roleStr.includes('USER') || roleStr.includes('COOK')) return 'Cuisinier / Utilisateur';
    return r;
  }

  logout(): void {
    this.authService.logout();
  }
}
