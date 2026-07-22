import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockMovement } from '../models/stock-movement.model';

@Injectable({
  providedIn: 'root'
})
export class StockMovementService {
  private readonly baseUrl = `${environment.apiUrl}/api/stock/movements`;

  constructor(private http: HttpClient) {}

  getAllStockMovements(): Observable<StockMovement[]> {
    return this.http.get<StockMovement[]>(this.baseUrl);
  }

  getMovementsByProduct(productId: number): Observable<StockMovement[]> {
    return this.http.get<StockMovement[]>(`${this.baseUrl}/product/${productId}`);
  }
}
