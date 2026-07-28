import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CaisseSupervisionRoutingModule } from './caisse-supervision-routing.module';
import { CaisseSupervisionComponent } from './caisse-supervision.component';

@NgModule({
  declarations: [
    CaisseSupervisionComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CaisseSupervisionRoutingModule
  ]
})
export class CaisseSupervisionModule { }
