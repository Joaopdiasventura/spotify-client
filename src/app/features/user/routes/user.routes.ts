import { Routes } from '@angular/router';
import { ProfilePage } from '../profile/profile-page/profile-page';
import { CreatePage } from '../create/create-page/create-page';
import { LoginPage } from '../login/login-page/login-page';
import { ConnectGuard } from '../../../core/guards/connect/connect-guard';
import { ProtectGuard } from '../../../core/guards/protect/protect-guard';

export const routes: Routes = [
  { path: '', canMatch: [ConnectGuard], canActivate: [ProtectGuard], component: ProfilePage },
  { path: 'create', component: CreatePage },
  { path: 'login', component: LoginPage },
];
