import { reqHandler } from '../dist/spotify/server/server.mjs';

export default function (req, res) {
  return reqHandler(req, res);
}