import { Routes } from '@angular/router';
import { ConnectGuard } from '../../../core/guards/connect/connect-guard';
import { ProtectGuard } from '../../../core/guards/protect/protect-guard';
import { PlaylistPage } from '../playlist-page/playlist-page';
import { CreatePage } from '../create/create-page/create-page';

export const routes: Routes = [
  { path: 'create', canMatch: [ConnectGuard], canActivate: [ProtectGuard], component: CreatePage },
  { path: ':id', canMatch: [ConnectGuard], component: PlaylistPage },
];
