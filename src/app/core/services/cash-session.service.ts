import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CashSession,
  CashMovement,
  OpenCashSessionRequest,
  CloseCashSessionRequest,
  CreateCashMovementRequest
} from '../models/cash-session.model';

@Injectable({
  providedIn: 'root'
})
export class CashSessionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/caisse/sessions`;

  openSession(request: OpenCashSessionRequest): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.apiUrl}/open`, request);
  }

  closeSession(id: number, request: CloseCashSessionRequest): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.apiUrl}/${id}/close`, request);
  }

  getCurrentUserSession(): Observable<CashSession | null> {
    return this.http.get<CashSession | null>(`${this.apiUrl}/current/user`);
  }

  getCurrentBoutiqueSession(boutiqueId: number): Observable<CashSession | null> {
    return this.http.get<CashSession | null>(`${this.apiUrl}/current/boutique/${boutiqueId}`);
  }

  getSessionById(id: number): Observable<CashSession> {
    return this.http.get<CashSession>(`${this.apiUrl}/${id}`);
  }

  getAllSessions(): Observable<CashSession[]> {
    return this.http.get<CashSession[]>(this.apiUrl);
  }

  getSessionsByBoutique(boutiqueId: number): Observable<CashSession[]> {
    return this.http.get<CashSession[]>(`${this.apiUrl}/boutique/${boutiqueId}`);
  }

  addMovement(sessionId: number, request: CreateCashMovementRequest): Observable<CashMovement> {
    return this.http.post<CashMovement>(`${this.apiUrl}/${sessionId}/movements`, request);
  }
}
