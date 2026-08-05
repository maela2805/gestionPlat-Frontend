import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StockReturn,
  StockReturnStatus,
  CreateStockReturnRequest,
  RejectStockReturnRequest
} from '../models/stock-return.model';

@Injectable({
  providedIn: 'root'
})
export class StockReturnService {
  private readonly baseUrl = `${environment.apiUrl}/api/stock/returns`;

  constructor(private http: HttpClient) {}

  getAllStockReturns(boutiqueId?: number, status?: StockReturnStatus): Observable<StockReturn[]> {
    let params = new HttpParams();
    if (boutiqueId) {
      params = params.set('boutiqueId', boutiqueId.toString());
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<StockReturn[]>(this.baseUrl, { params });
  }

  getStockReturnById(id: number): Observable<StockReturn> {
    return this.http.get<StockReturn>(`${this.baseUrl}/${id}`);
  }

  createStockReturn(request: CreateStockReturnRequest): Observable<StockReturn> {
    return this.http.post<StockReturn>(this.baseUrl, request);
  }

  approveStockReturn(id: number): Observable<StockReturn> {
    return this.http.post<StockReturn>(`${this.baseUrl}/${id}/approve`, {});
  }

  rejectStockReturn(id: number, request?: RejectStockReturnRequest): Observable<StockReturn> {
    return this.http.post<StockReturn>(`${this.baseUrl}/${id}/reject`, request || {});
  }

  cancelStockReturn(id: number): Observable<StockReturn> {
    return this.http.post<StockReturn>(`${this.baseUrl}/${id}/cancel`, {});
  }
}
