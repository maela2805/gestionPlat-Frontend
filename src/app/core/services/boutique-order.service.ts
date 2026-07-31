import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BoutiqueOrder,
  CreateBoutiqueOrderRequest,
  ApproveBoutiqueOrderRequest
} from '../models/boutique-order.model';
import { Invoice } from '../models/invoice.model';

@Injectable({
  providedIn: 'root'
})
export class BoutiqueOrderService {
  private apiUrl = `${environment.apiUrl}/api/boutique-orders`;

  constructor(private http: HttpClient) {}

  getAllOrders(): Observable<BoutiqueOrder[]> {
    return this.http.get<BoutiqueOrder[]>(this.apiUrl);
  }

  getOrdersByBoutique(boutiqueId: number): Observable<BoutiqueOrder[]> {
    return this.http.get<BoutiqueOrder[]>(`${this.apiUrl}/boutique/${boutiqueId}`);
  }

  getOrderById(id: number): Observable<BoutiqueOrder> {
    return this.http.get<BoutiqueOrder>(`${this.apiUrl}/${id}`);
  }

  createOrder(req: CreateBoutiqueOrderRequest): Observable<BoutiqueOrder> {
    return this.http.post<BoutiqueOrder>(this.apiUrl, req);
  }

  approveOrder(id: number, req: ApproveBoutiqueOrderRequest): Observable<BoutiqueOrder> {
    return this.http.put<BoutiqueOrder>(`${this.apiUrl}/${id}/approve`, req);
  }

  rejectOrder(id: number, reason?: string): Observable<BoutiqueOrder> {
    return this.http.put<BoutiqueOrder>(`${this.apiUrl}/${id}/reject`, null, {
      params: reason ? { reason } : {}
    });
  }

  cancelOrder(id: number): Observable<BoutiqueOrder> {
    return this.http.put<BoutiqueOrder>(`${this.apiUrl}/${id}/cancel`, null);
  }

  deleteOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  createInvoiceForOrder(orderId: number): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/${orderId}/create-invoice`, null);
  }
}
