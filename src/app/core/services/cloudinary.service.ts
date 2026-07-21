import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {

  constructor(private http: HttpClient) {}

  uploadImage(file: File): Observable<string> {
    const cloudName = environment.cloudinary.cloudName;
    const uploadPreset = environment.cloudinary.uploadPreset;
    
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    return this.http.post<CloudinaryUploadResponse>(url, formData).pipe(
      map(response => response.secure_url)
    );
  }
}
