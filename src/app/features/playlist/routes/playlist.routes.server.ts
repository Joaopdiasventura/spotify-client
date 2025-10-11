import { RenderMode, ServerRoute } from '@angular/ssr';

export const playlistServerRoutes: ServerRoute[] = [
  {
    path: 'playlist',
    renderMode: RenderMode.Client,
  },
  {
    path: 'playlist/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'playlist/create',
    renderMode: RenderMode.Client,
  },
];
