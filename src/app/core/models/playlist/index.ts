import { Song } from '../song';
import { User } from '../user';

export interface Playlist {
  _id: string;
  name: string;
  description?: string;
  owner: string; // User ID
  songs: string[]; // Array de Song IDs
  coverImage?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  // Campos populados (opcionais, para quando fizer populate)
  ownerDetails?: User;
  songDetails?: Song[];
  // Estatísticas (pode ser calculado no frontend ou vindo do backend)
  totalDuration?: number;
}

// Para criação de nova playlist
export interface CreatePlaylistDto {
  name: string;
  description?: string;
  isPublic?: boolean;
  coverImage?: string;
  songs?: string[];
  user: string;
}

// Para atualização de playlist
export interface UpdatePlaylistDto {
  name?: string;
  description?: string;
  isPublic?: boolean;
  coverImage?: string;
  songs?: string[];
}

// Filtros para buscar playlists
export interface PlaylistFilters {
  name?: string;
  owner?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
  orderBy?: string;
}

// Resposta paginada para listagem de playlists
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

// Para adicionar/remover músicas de uma playlist
export interface UpdatePlaylistSongsDto {
  action: 'add' | 'remove';
  songIds: string[];
}

// Estatísticas da playlist (pode ser útil para exibir informações)
export interface PlaylistStats {
  totalSongs: number;
  totalDuration: number;
  genres: string[];
}
