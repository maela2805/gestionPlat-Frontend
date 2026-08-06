import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BoutiquePromotion, CreateBoutiquePromotionRequest } from '../models/boutique-promotion.model';

@Injectable({
  providedIn: 'root'
})
export class BoutiquePromotionService {
  private apiUrl = `${environment.apiUrl}/api/promotions`;

  constructor(private http: HttpClient) {}

  getAllPromotions(boutiqueId?: number): Observable<BoutiquePromotion[]> {
    if (boutiqueId) {
      return this.http.get<BoutiquePromotion[]>(`${this.apiUrl}?boutiqueId=${boutiqueId}`);
    }
    return this.http.get<BoutiquePromotion[]>(this.apiUrl);
  }

  getActivePromotions(boutiqueId: number): Observable<BoutiquePromotion[]> {
    return this.http.get<BoutiquePromotion[]>(`${this.apiUrl}/active?boutiqueId=${boutiqueId}`);
  }

  getActivePromotionForProduct(boutiqueId: number, productId: number): Observable<BoutiquePromotion> {
    return this.http.get<BoutiquePromotion>(`${this.apiUrl}/active-product?boutiqueId=${boutiqueId}&productId=${productId}`);
  }

  createPromotion(request: CreateBoutiquePromotionRequest): Observable<BoutiquePromotion> {
    return this.http.post<BoutiquePromotion>(this.apiUrl, request);
  }

  toggleStatus(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  deletePromotion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
