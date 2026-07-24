import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StoreSalesComponent } from './store-sales.component';

const routes: Routes = [
  { path: '', component: StoreSalesComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StoreSalesRoutingModule { }
