import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CaissePosComponent } from './caisse-pos.component';

const routes: Routes = [
  { path: '', component: CaissePosComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CaissePosRoutingModule { }
