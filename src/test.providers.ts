import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import {
  LucideAngularModule,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Shuffle,
  Repeat,
  Home,
  Search,
  Music,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-angular';

export default [
  provideZonelessChangeDetection(),
  importProvidersFrom(
    LucideAngularModule.pick({
      Play,
      Pause,
      SkipBack,
      SkipForward,
      Volume2,
      Shuffle,
      Repeat,
      Home,
      Search,
      Music,
      X,
      ChevronLeft,
      ChevronRight,
      Menu,
    })
  ),
];
