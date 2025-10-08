import { RenderMode, ServerRoute } from '@angular/ssr';

export const userServerRoutes: ServerRoute[] = [
  {
    path: 'user',
    renderMode: RenderMode.Client,
  },
  {
    path: 'user/create',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'user/login',
    renderMode: RenderMode.Prerender,
  },
];
