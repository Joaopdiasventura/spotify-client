import { Song } from '../song';
import { User } from '../user';

export interface Playlist {
  _id: string;
  name: string;
  description?: string;
  owner?: string;
  user?: string | User;
  songs: string[] | Song[];
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
  if (typeof playlist.user === 'object' && playlist.user !== null) {
    return playlist.user._id;
  }
  return playlist.owner || playlist.user;
}

export function getPlaylistOwnerName(playlist: Playlist): string {
  if (typeof playlist.user === 'object' && playlist.user !== null && playlist.user.name) {
    return playlist.user.name;
  }
  if (playlist.ownerDetails?.name) {
    return playlist.ownerDetails.name;
  }
  return 'Usuário';
}

export type PlaylistSong = string | Song;

export function isSongObject(song: PlaylistSong): song is Song {
  return typeof song === 'object' && song !== null && 'title' in song && 'artist' in song;
}

export function getPlaylistSongs(playlist: Playlist): Song[] {
  if (!playlist.songs) return [];

  if (playlist.songs.length > 0 && isSongObject(playlist.songs[0])) {
    return playlist.songs as Song[];
  }
  return [];
}

export function getSongId(song: PlaylistSong, index: number): string {
  if (isSongObject(song)) {
    return song._id;
  }
  return `song-${index}`;
}

export function getSongTitle(song: PlaylistSong): string {
  if (isSongObject(song)) {
    return song.title;
  }
  return 'Título desconhecido';
}

export function getSongArtist(song: PlaylistSong): string {
  if (isSongObject(song)) {
    return song.artist;
  }
  return 'Artista desconhecido';
}

export function getSongThumbnail(song: PlaylistSong): string | null {
  if (isSongObject(song) && song.thumbnail) {
    return song.thumbnail;
  }
  return null;
}

export function getSongDescription(song: PlaylistSong): string | null {
  if (isSongObject(song) && song.description) {
    return song.description;
  }
  return null;
}

export function getSongDuration(song: PlaylistSong): number {
  if (isSongObject(song) && song.duration) {
    return song.duration;
  }
  return 0;
}
