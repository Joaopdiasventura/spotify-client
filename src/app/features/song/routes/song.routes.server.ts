import { RenderMode, ServerRoute } from '@angular/ssr';

export const songServerRoutes: ServerRoute[] = [
  {
    path: 'song',
    renderMode: RenderMode.Client,
  },
  // {
  //   path: 'song/create',
  //   renderMode: RenderMode.Client,
  // },
];
