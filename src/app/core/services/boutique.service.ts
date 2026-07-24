import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Boutique, CreateBoutiqueRequest, BoutiquePrice, SetWholesalePriceRequest } from '../models/boutique.model';

@Injectable({
  providedIn: 'root'
})
export class BoutiqueService {
  private readonly baseUrl = `${environment.apiUrl}/api/boutiques`;

  constructor(private http: HttpClient) {}

  getAllBoutiques(): Observable<Boutique[]> {
    return this.http.get<Boutique[]>(this.baseUrl);
  }

  getBoutiqueById(id: number): Observable<Boutique> {
    return this.http.get<Boutique>(`${this.baseUrl}/${id}`);
  }

  createBoutique(request: CreateBoutiqueRequest): Observable<Boutique> {
    return this.http.post<Boutique>(this.baseUrl, request);
  }

  updateBoutique(id: number, request: CreateBoutiqueRequest): Observable<Boutique> {
    return this.http.put<Boutique>(`${this.baseUrl}/${id}`, request);
  }

  deleteBoutique(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getBoutiquePrices(boutiqueId: number): Observable<BoutiquePrice[]> {
    return this.http.get<BoutiquePrice[]>(`${this.baseUrl}/${boutiqueId}/prices`);
  }

  setWholesalePrice(boutiqueId: number, request: SetWholesalePriceRequest): Observable<BoutiquePrice> {
    return this.http.post<BoutiquePrice>(`${this.baseUrl}/${boutiqueId}/prices`, request);
  }
}
