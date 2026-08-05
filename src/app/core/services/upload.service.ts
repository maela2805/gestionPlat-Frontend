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
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            resolve(compressed);
          } else {
            resolve(e.target.result);
          }
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }
}
