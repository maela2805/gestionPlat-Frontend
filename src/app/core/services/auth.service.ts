import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'gestplat_jwt_token';
  private readonly USER_KEY = 'gestplat_user_info';

  currentUser = signal<User | null>(this.getStoredUser());
  token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
  isAuthenticated = computed(() => !!this.token());

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, credentials).pipe(
      tap(response => {
        const token = response.accessToken || response.token;
        if (token) {
          this.saveToken(token);
          const userObj: User = {
            id: response.userId || 0,
            email: response.email,
            firstName: response.firstName,
            lastName: response.lastName,
            active: true,
            roleName: response.role || 'ROLE_EMPLOYEE'
          };
          this.currentUser.set(userObj);
          localStorage.setItem(this.USER_KEY, JSON.stringify(userObj));
        }
      })
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/register`, userData).pipe(
      tap(response => {
        const token = response.accessToken || response.token;
        if (token) {
          this.saveToken(token);
          const userObj: User = {
            id: response.userId || 0,
            email: response.email,
            firstName: response.firstName,
            lastName: response.lastName,
            active: true,
            roleName: response.role || 'ROLE_CLIENT'
          };
          this.currentUser.set(userObj);
          localStorage.setItem(this.USER_KEY, JSON.stringify(userObj));
        }
      })
    );
  }

  fetchProfile(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/api/auth/me`).pipe(
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  hasRole(requiredRole: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const roleName = user.roleName || (user.role && user.role.name) || (typeof user.role === 'string' ? user.role : '') || '';
    if (roleName === 'ROLE_SUPER_ADMIN' || roleName === 'SUPER_ADMIN') return true;
    return roleName === requiredRole || roleName === `ROLE_${requiredRole}`;
  }

  hasAnyRole(allowedRoles: string[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const roleName = user.roleName || (user.role && user.role.name) || (typeof user.role === 'string' ? user.role : '') || '';
    if (roleName === 'ROLE_SUPER_ADMIN' || roleName === 'SUPER_ADMIN') return true;
    return allowedRoles.some(r => roleName === r || roleName === `ROLE_${r}` || `ROLE_${roleName}` === r);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.token.set(token);
  }

  private getStoredUser(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
