import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { staffGuard } from './core/guards/staff.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) 
  },
  { 
    path: 'register', 
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) 
  },
  { 
    path: 'dashboard', 
    canActivate: [staffGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) 
  },
  { 
    path: 'products', 
    canActivate: [staffGuard],
    loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent) 
  },
  { 
    path: 'categories', 
    canActivate: [staffGuard],
    loadComponent: () => import('./features/categories/categories.component').then(m => m.CategoriesComponent) 
  },
  { 
    path: 'stock', 
    canActivate: [staffGuard],
    loadComponent: () => import('./features/stock/stock.component').then(m => m.StockComponent) 
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
    path: 'caisse-pos', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/caisse-pos/caisse-pos.module').then(m => m.CaissePosModule) 
  },
  { 
    path: 'caisse-supervision', 
    canActivate: [authGuard],
    loadChildren: () => import('./features/caisse-supervision/caisse-supervision.module').then(m => m.CaisseSupervisionModule) 
  },
  { 
    path: 'profile', 
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) 
  },
  { path: '**', redirectTo: 'dashboard' }
];
