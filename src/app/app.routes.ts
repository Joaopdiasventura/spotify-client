import { Routes } from '@angular/router';
import { HomePage } from './features/home/home-page/home-page';
import { ConnectGuard } from './core/guards/connect/connect-guard';

export const routes: Routes = [
  { path: 'home', canMatch: [ConnectGuard], component: HomePage },
  {
    path: 'user',
    loadChildren: () => import('./features/user/routes/user.routes').then((m) => m.routes),
  },
  {
    path: 'song',
    loadChildren: () => import('./features/song/routes/song.routes').then((m) => m.routes),
  },
  { path: '**', redirectTo: 'home' },
];
