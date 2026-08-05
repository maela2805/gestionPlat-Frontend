import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { StockReturnsRoutingModule } from './stock-returns-routing.module';
import { StockReturnsComponent } from './stock-returns.component';

@NgModule({
  declarations: [
    StockReturnsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    StockReturnsRoutingModule
  ]
})
export class StockReturnsModule { }
