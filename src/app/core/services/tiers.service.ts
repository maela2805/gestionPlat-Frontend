import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tiers, TiersType, TiersStatus, CreateTiersRequest, UpdateTiersRequest } from '../models/tiers.model';

@Injectable({
  providedIn: 'root'
})
export class TiersService {
  private readonly baseUrl = `${environment.apiUrl}/api/tiers`;

  constructor(private http: HttpClient) {}

  getAllTiers(type?: TiersType, status?: TiersStatus): Observable<Tiers[]> {
    let params = new HttpParams();
    if (type) {
      params = params.set('type', type);
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Tiers[]>(this.baseUrl, { params });
  }

  getTiersById(id: number): Observable<Tiers> {
    return this.http.get<Tiers>(`${this.baseUrl}/${id}`);
  }

  createTiers(request: CreateTiersRequest): Observable<Tiers> {
    return this.http.post<Tiers>(this.baseUrl, request);
  }

  updateTiers(id: number, request: UpdateTiersRequest): Observable<Tiers> {
    return this.http.put<Tiers>(`${this.baseUrl}/${id}`, request);
  }

  deleteTiers(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
