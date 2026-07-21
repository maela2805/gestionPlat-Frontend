import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { StockRoutingModule } from './stock-routing.module';
import { StockComponent } from './stock.component';

@NgModule({
  declarations: [
    StockComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    StockRoutingModule
  ]
})
export class StockModule { }
