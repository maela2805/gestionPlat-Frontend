import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: '', 
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule) 
  },
  { 
    path: 'dashboard', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule) 
  },
  { 
    path: 'products', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/products/products.module').then(m => m.ProductsModule) 
  },
  { 
    path: 'categories', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/categories/categories.module').then(m => m.CategoriesModule) 
  },
  { 
    path: 'stock', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/stock/stock.module').then(m => m.StockModule) 
  },
  { 
    path: 'inventories', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/inventory/inventory.module').then(m => m.InventoryModule) 
  },
  { 
    path: 'tiers', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/tiers/tiers.module').then(m => m.TiersModule) 
  },
  { 
    path: 'boutiques', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/boutiques/boutiques.module').then(m => m.BoutiquesModule) 
  },
  { 
    path: 'warehouses', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/warehouses/warehouses.module').then(m => m.WarehousesModule) 
  },
  { 
    path: 'purchase-orders', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/purchase-orders/purchase-orders.module').then(m => m.PurchaseOrdersModule) 
  },
  { 
    path: 'store-sales', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/store-sales/store-sales.module').then(m => m.StoreSalesModule) 
  },
  { 
    path: 'profile', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/profile/profile.module').then(m => m.ProfileModule) 
  },
  { 
    path: 'users', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/users/users.module').then(m => m.UsersModule) 
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
