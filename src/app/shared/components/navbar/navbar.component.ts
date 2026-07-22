import { Component, Input, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  @Input() title: string = 'Tableau de bord';
  @Input() subtitle?: string;

  private authService = inject(AuthService);
  user = this.authService.currentUser;

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
