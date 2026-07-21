import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NavbarComponent } from './components/navbar/navbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { ImageUploadComponent } from './components/image-upload/image-upload.component';

import { DefaultImagePipe } from './pipes/default-image.pipe';
import { CurrencyFcfaPipe } from './pipes/currency-fcfa.pipe';

@NgModule({
  declarations: [
    NavbarComponent,
    SidebarComponent,
    StatCardComponent,
    ImageUploadComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    DefaultImagePipe,
    CurrencyFcfaPipe
  ],
  exports: [
    CommonModule,
    RouterModule,
    NavbarComponent,
    SidebarComponent,
    StatCardComponent,
    ImageUploadComponent,
    DefaultImagePipe,
    CurrencyFcfaPipe
  ]
})
export class SharedModule { }
