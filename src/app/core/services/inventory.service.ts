import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Inventory, CreateInventoryRequest } from '../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private apiUrl = `${environment.apiUrl}/inventories`;

  constructor(private http: HttpClient) {}

  getAllInventories(boutiqueId?: number): Observable<Inventory[]> {
    let params = new HttpParams();
    if (boutiqueId) {
      params = params.set('boutiqueId', boutiqueId.toString());
    }
    return this.http.get<Inventory[]>(this.apiUrl, { params });
  }

  getInventoryById(id: number): Observable<Inventory> {
    return this.http.get<Inventory>(`${this.apiUrl}/${id}`);
  }

  createInventory(request: CreateInventoryRequest): Observable<Inventory> {
    return this.http.post<Inventory>(this.apiUrl, request);
  }

  validateInventory(id: number): Observable<Inventory> {
    return this.http.put<Inventory>(`${this.apiUrl}/${id}/validate`, {});
  }
}
