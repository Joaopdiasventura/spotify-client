import { Routes } from '@angular/router';
import { HomePage } from './features/home/home-page/home-page';
import { ConnectGuard } from './core/guards/connect/connect-guard';
import { CreatePlaylistPage } from './features/playlist/create/create-playlist-page';

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
  {
    path: 'playlists/create',
    component: CreatePlaylistPage
  },
  { path: '**', redirectTo: 'home' },
];
