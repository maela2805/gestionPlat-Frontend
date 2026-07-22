import { Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { CloudinaryService } from '../../../core/services/cloudinary.service';

@Component({
  selector: 'app-image-upload',
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss']
})
export class ImageUploadComponent {
  private cloudinaryService = inject(CloudinaryService);

  @Input() label: string = 'Photo du plat';
  @Input() optional: boolean = true;
  
  @Input() set currentUrl(value: string | undefined | null) {
    this.imageUrl.set(value || null);
  }

  @Output() imageUploaded = new EventEmitter<string | null>();

  imageUrl = signal<string | null>(null);
  isUploading = signal<boolean>(false);
  uploadError = signal<string | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('La taille de l\'image ne doit pas dépasser 5 Mo.');
      return;
    }

    this.uploadError.set(null);
    this.isUploading.set(true);

    this.cloudinaryService.uploadImage(file).subscribe({
      next: (secureUrl: string) => {
        this.imageUrl.set(secureUrl);
        this.isUploading.set(false);
        this.uploadError.set(null);
        this.imageUploaded.emit(secureUrl);
      },
      error: (err: any) => {
        console.warn('Cloudinary error, fallback to compressed local Base64:', err);
        this.compressImage(file)
          .then(compressedUrl => {
            this.imageUrl.set(compressedUrl);
            this.isUploading.set(false);
            this.uploadError.set(null);
            this.imageUploaded.emit(compressedUrl);
          })
          .catch(() => {
            this.isUploading.set(false);
            this.uploadError.set('Échec du traitement de l\'image.');
          });
      }
    });
  }

  private compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context error'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(img.src);
        resolve(compressedDataUrl);
      };
      img.onerror = err => reject(err);
    });
  }

  removeImage(): void {
    this.imageUrl.set(null);
    this.imageUploaded.emit(null);
  }
}
