import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PosSale, CreatePosSaleRequest } from '../models/pos-sale.model';

@Injectable({
  providedIn: 'root'
})
export class PosSaleService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/pos/sales`;

  createPosSale(request: CreatePosSaleRequest): Observable<PosSale> {
    return this.http.post<PosSale>(this.apiUrl, request);
  }

  getPosSaleById(id: number): Observable<PosSale> {
    return this.http.get<PosSale>(`${this.apiUrl}/${id}`);
  }

  getPosSaleByReceiptNumber(receiptNumber: string): Observable<PosSale> {
    return this.http.get<PosSale>(`${this.apiUrl}/receipt/${receiptNumber}`);
  }

  getPosSalesBySession(sessionId: number): Observable<PosSale[]> {
    return this.http.get<PosSale[]>(`${this.apiUrl}/session/${sessionId}`);
  }

  getPosSalesByBoutique(boutiqueId: number): Observable<PosSale[]> {
    return this.http.get<PosSale[]>(`${this.apiUrl}/boutique/${boutiqueId}`);
  }

  getAllPosSales(): Observable<PosSale[]> {
    return this.http.get<PosSale[]>(this.apiUrl);
  }

  cancelPosSale(id: number): Observable<PosSale> {
    return this.http.post<PosSale>(`${this.apiUrl}/${id}/cancel`, {});
  }
}
