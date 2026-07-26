import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BoutiqueStockDTO, TransferStockRequest } from '../models/warehouse.model';

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private apiUrl = `${environment.apiUrl}/warehouses`;

  constructor(private http: HttpClient) {}

  getStocksByBoutique(boutiqueId: number): Observable<BoutiqueStockDTO[]> {
    return this.http.get<BoutiqueStockDTO[]>(`${this.apiUrl}/boutique/${boutiqueId}`);
  }

  getAllBoutiqueStocks(): Observable<BoutiqueStockDTO[]> {
    return this.http.get<BoutiqueStockDTO[]>(`${this.apiUrl}/stocks`);
  }

  transferStock(request: TransferStockRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/transfer`, request, { responseType: 'text' });
  }
}
