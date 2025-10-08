import { RenderMode, ServerRoute } from '@angular/ssr';
import { userServerRoutes } from './features/user/routes/user.routes.server';
import { songServerRoutes } from './features/song/routes/song.routes.server';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'home',
    renderMode: RenderMode.Server,
  },
  ...userServerRoutes,
  ...songServerRoutes,
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
