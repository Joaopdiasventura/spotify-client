import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  LucideAngularModule,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Shuffle,
  Repeat,
  House,
  User,
  LogIn,
  Search,
  Music,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  UserPlus,
  Mail,
  Lock,
  Upload,
  Image,
  LogOut,
  Maximize2,
  Minimize2,
} from 'lucide-angular';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    importProvidersFrom(
      LucideAngularModule.pick({
        Play,
        Pause,
        SkipBack,
        SkipForward,
        Volume2,
        Shuffle,
        Repeat,
        House,
        User,
        UserPlus,
        Mail,
        Lock,
        Upload,
        Image,
        LogIn,
        Search,
        Music,
        AlertCircle,
        X,
        ChevronLeft,
        ChevronRight,
        Menu,
        LogOut,
        Maximize2,
        Minimize2,
      })
    ),
  ],
};
