import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'defaultImage',
  standalone: true
})
export class DefaultImagePipe implements PipeTransform {
  // SVG placeholder for catering dish / food item
  private readonly defaultDishImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none"><rect width="400" height="300" fill="%231E1E26"/><path d="M140 180C140 146.863 166.863 120 200 120C233.137 120 260 146.863 260 180H140Z" fill="%23FF6B35" fill-opacity="0.8"/><circle cx="200" cy="110" r="10" fill="%23FFD166"/><rect x="120" y="185" width="160" height="10" rx="5" fill="%233A3A4A"/><text x="50%25" y="235" text-anchor="middle" fill="%23A0A0B0" font-family="sans-serif" font-size="14">KIKI TRAITEUR</text></svg>';

  transform(url: string | undefined | null): string {
    if (!url || url.trim() === '') {
      return this.defaultDishImage;
    }
    return url;
  }
}
