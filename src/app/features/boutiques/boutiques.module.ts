import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { BoutiquesRoutingModule } from './boutiques-routing.module';
import { BoutiquesComponent } from './boutiques.component';

@NgModule({
  declarations: [
    BoutiquesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    BoutiquesRoutingModule
  ]
})
export class BoutiquesModule { }
