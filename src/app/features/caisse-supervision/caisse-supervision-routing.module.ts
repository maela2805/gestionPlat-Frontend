import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CaisseSupervisionComponent } from './caisse-supervision.component';

const routes: Routes = [
  { path: '', component: CaisseSupervisionComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CaisseSupervisionRoutingModule { }
