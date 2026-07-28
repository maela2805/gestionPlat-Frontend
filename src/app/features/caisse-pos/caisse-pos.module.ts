import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CaissePosRoutingModule } from './caisse-pos-routing.module';
import { CaissePosComponent } from './caisse-pos.component';

@NgModule({
  declarations: [
    CaissePosComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CaissePosRoutingModule
  ]
})
export class CaissePosModule { }
