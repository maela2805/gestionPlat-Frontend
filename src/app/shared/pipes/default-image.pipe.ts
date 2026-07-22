import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'defaultImage',
  standalone: true
})
export class DefaultImagePipe implements PipeTransform {
  private readonly defaultDishImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none"><rect width="400" height="300" fill="%23f4f6fa"/><rect x="40" y="40" width="320" height="220" rx="16" fill="%23ffffff" stroke="%23e8e8e8" stroke-width="2"/><circle cx="200" cy="130" r="35" fill="%231890ff" fill-opacity="0.1"/><path d="M190 120L210 120M200 110L200 150" stroke="%231890ff" stroke-width="3" stroke-linecap="round"/><text x="50%25" y="210" text-anchor="middle" fill="%231890ff" font-family="sans-serif" font-weight="bold" font-size="14">GESTEN</text></svg>';

  transform(url: string | undefined | null): string {
    if (!url || url.trim() === '') {
      return this.defaultDishImage;
    }
    return url;
  }
}
