import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { TiersRoutingModule } from './tiers-routing.module';
import { TiersComponent } from './tiers.component';

@NgModule({
  declarations: [
    TiersComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    TiersRoutingModule
  ]
})
export class TiersModule { }
