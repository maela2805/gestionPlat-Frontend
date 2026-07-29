import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Invoice, CreateInvoiceRequest, Payment, CreatePaymentRequest, InvoiceType, InvoiceStatus } from '../models/invoice.model';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private readonly baseUrl = `${environment.apiUrl}/api/invoices`;

  constructor(private http: HttpClient) {}

  getAllInvoices(type?: InvoiceType, status?: InvoiceStatus): Observable<Invoice[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (status) params = params.set('status', status);

    return this.http.get<Invoice[]>(this.baseUrl, { params });
  }

  getInvoiceById(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.baseUrl}/${id}`);
  }

  createInvoice(request: CreateInvoiceRequest): Observable<Invoice> {
    return this.http.post<Invoice>(this.baseUrl, request);
  }

  createInvoiceFromSale(saleId: number): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.baseUrl}/from-sale/${saleId}`, {});
  }

  createInvoiceFromPurchaseOrder(purchaseId: number): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.baseUrl}/from-purchase/${purchaseId}`, {});
  }

  validateInvoice(id: number): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.baseUrl}/${id}/validate`, {});
  }

  cancelInvoice(id: number): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.baseUrl}/${id}/cancel`, {});
  }

  addPayment(request: CreatePaymentRequest): Observable<Payment> {
    return this.http.post<Payment>(`${this.baseUrl}/payments`, request);
  }

  getPaymentsByInvoiceId(invoiceId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.baseUrl}/${invoiceId}/payments`);
  }
}
