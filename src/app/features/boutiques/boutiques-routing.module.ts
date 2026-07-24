import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BoutiquesComponent } from './boutiques.component';

const routes: Routes = [
  { path: '', component: BoutiquesComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BoutiquesRoutingModule { }
