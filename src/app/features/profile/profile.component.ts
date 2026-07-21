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
    return u.email.substring(0, 2).toUpperCase();
  }
}
