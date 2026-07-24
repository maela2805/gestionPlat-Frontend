import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StoreSale, CreateStoreSaleRequest } from '../models/store-sale.model';

@Injectable({
  providedIn: 'root'
})
export class StoreSaleService {
  private readonly baseUrl = `${environment.apiUrl}/api/store-sales`;

  constructor(private http: HttpClient) {}

  getAllStoreSales(): Observable<StoreSale[]> {
    return this.http.get<StoreSale[]>(this.baseUrl);
  }

  getStoreSaleById(id: number): Observable<StoreSale> {
    return this.http.get<StoreSale>(`${this.baseUrl}/${id}`);
  }

  createStoreSale(request: CreateStoreSaleRequest): Observable<StoreSale> {
    return this.http.post<StoreSale>(this.baseUrl, request);
  }

  validateStoreSale(id: number): Observable<StoreSale> {
    return this.http.put<StoreSale>(`${this.baseUrl}/${id}/validate`, {});
  }

  cancelStoreSale(id: number): Observable<StoreSale> {
    return this.http.put<StoreSale>(`${this.baseUrl}/${id}/cancel`, {});
  }
}
