import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private cloudinaryUrl = `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/auto/upload`;

  constructor(private http: HttpClient) {}

  uploadMedia(file: File): Observable<{ url: string }> {
    if (environment.cloudinary && environment.cloudinary.cloudName && environment.cloudinary.uploadPreset) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', environment.cloudinary.uploadPreset);

      return new Observable(observer => {
        this.http.post<any>(this.cloudinaryUrl, formData).subscribe({
          next: (res) => {
            observer.next({ url: res.secure_url || res.url });
            observer.complete();
          },
          error: (err) => {
            console.error('Cloudinary upload error, using local base64 fallback:', err);
            this.readFileAsBase64(file).then(url => {
              observer.next({ url });
              observer.complete();
            });
          }
        });
      });
    } else {
      return from(this.readFileAsBase64(file).then(url => ({ url })));
    }
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }
}
