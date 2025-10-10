export interface Song {
  _id: string;
  title: string;
  description?: string;
  artist: string;
  lyrics?: string;
  url: string;
  thumbnail?: string;
  duration: number;
  user: string;
  createdAt: string;
  updatedAt: string;
}
