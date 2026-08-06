import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BoutiqueWallet, CreateFundTransferRequest, FundTransfer, FundTransferStatus } from '../models/fund-transfer.model';

@Injectable({
  providedIn: 'root'
})
export class FundTransferService {
  private apiUrl = `${environment.apiUrl}/api/accounting`;

  constructor(private http: HttpClient) {}

  createTransfer(request: CreateFundTransferRequest): Observable<FundTransfer> {
    return this.http.post<FundTransfer>(`${this.apiUrl}/transfers`, request);
  }

  getAllTransfers(boutiqueId?: number, status?: FundTransferStatus): Observable<FundTransfer[]> {
    let params = new HttpParams();
    if (boutiqueId) params = params.set('boutiqueId', boutiqueId.toString());
    if (status) params = params.set('status', status);
    return this.http.get<FundTransfer[]>(`${this.apiUrl}/transfers`, { params });
  }

  getTransferById(id: number): Observable<FundTransfer> {
    return this.http.get<FundTransfer>(`${this.apiUrl}/transfers/${id}`);
  }

  approveTransfer(id: number): Observable<FundTransfer> {
    return this.http.post<FundTransfer>(`${this.apiUrl}/transfers/${id}/approve`, {});
  }

  rejectTransfer(id: number, reason?: string): Observable<FundTransfer> {
    return this.http.post<FundTransfer>(`${this.apiUrl}/transfers/${id}/reject`, { reason });
  }

  cancelTransfer(id: number): Observable<FundTransfer> {
    return this.http.post<FundTransfer>(`${this.apiUrl}/transfers/${id}/cancel`, {});
  }

  getBoutiqueWallet(boutiqueId?: number | null): Observable<BoutiqueWallet> {
    if (boutiqueId) {
      return this.http.get<BoutiqueWallet>(`${this.apiUrl}/wallet/${boutiqueId}`);
    }
    return this.http.get<BoutiqueWallet>(`${this.apiUrl}/wallet`);
  }
}
