import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { StoreSalesRoutingModule } from './store-sales-routing.module';
import { StoreSalesComponent } from './store-sales.component';

@NgModule({
  declarations: [
    StoreSalesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    StoreSalesRoutingModule
  ]
})
export class StoreSalesModule { }
