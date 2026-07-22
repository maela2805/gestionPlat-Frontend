import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserSystem, SystemRole, UserCreateRequest, UserUpdateRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = `${environment.apiUrl}/api/users`;

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<UserSystem[]> {
    return this.http.get<UserSystem[]>(this.baseUrl);
  }

  getAllRoles(): Observable<SystemRole[]> {
    return this.http.get<SystemRole[]>(`${this.baseUrl}/roles`);
  }

  getUserById(id: number): Observable<UserSystem> {
    return this.http.get<UserSystem>(`${this.baseUrl}/${id}`);
  }

  createUser(request: UserCreateRequest): Observable<UserSystem> {
    return this.http.post<UserSystem>(this.baseUrl, request);
  }

  updateUser(id: number, request: UserUpdateRequest): Observable<UserSystem> {
    return this.http.put<UserSystem>(`${this.baseUrl}/${id}`, request);
  }

  toggleUserStatus(id: number): Observable<UserSystem> {
    return this.http.put<UserSystem>(`${this.baseUrl}/${id}/toggle-status`, {});
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
