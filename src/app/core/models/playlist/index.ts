import { Song } from '../song';
import { User } from '../user';

export interface Playlist {
  _id: string;
  name: string;
  description?: string;
  owner?: string;
  user?: string;
  songs: string[];
  coverImage?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  ownerDetails?: User;
  songDetails?: Song[];
}

export interface CreatePlaylistDto {
  name: string;
  description?: string;
  isPublic?: boolean;
  coverImage?: string;
  songs?: string[];
  user: string;
}

export interface UpdatePlaylistDto {
  name?: string;
  description?: string;
  isPublic?: boolean;
  coverImage?: string;
  songs?: string[];
}

export interface PlaylistFilters {
  name?: string;
  owner?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
  orderBy?: string;
}

export interface PlaylistResponse {
  data: Playlist[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UpdatePlaylistSongsDto {
  action: 'add' | 'remove';
  songIds: string[];
}

export interface PlaylistStats {
  totalSongs: number;
  totalDuration: number;
  genres: string[];
}

export function getPlaylistOwnerId(playlist: Playlist): string | undefined {
  return playlist.owner || playlist.user;
}
