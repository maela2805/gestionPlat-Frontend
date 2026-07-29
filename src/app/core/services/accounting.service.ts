import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountingEntry, CreateAccountingEntryRequest, FinancialSummary, EntryType, AccountingCategory } from '../models/accounting.model';

@Injectable({
  providedIn: 'root'
})
export class AccountingService {
  private readonly baseUrl = `${environment.apiUrl}/api/accounting`;

  constructor(private http: HttpClient) {}

  getAllEntries(type?: EntryType, category?: AccountingCategory, startDate?: string, endDate?: string): Observable<AccountingEntry[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (category) params = params.set('category', category);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<AccountingEntry[]>(`${this.baseUrl}/entries`, { params });
  }

  getEntryById(id: number): Observable<AccountingEntry> {
    return this.http.get<AccountingEntry>(`${this.baseUrl}/entries/${id}`);
  }

  createManualEntry(request: CreateAccountingEntryRequest): Observable<AccountingEntry> {
    return this.http.post<AccountingEntry>(`${this.baseUrl}/entries`, request);
  }

  getFinancialSummary(startDate?: string, endDate?: string): Observable<FinancialSummary> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<FinancialSummary>(`${this.baseUrl}/summary`, { params });
  }
}
