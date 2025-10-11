import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Playlist,
  CreatePlaylistDto,
  UpdatePlaylistDto,
  PlaylistFilters,
  UpdatePlaylistSongsDto
} from '../../models/playlist';

declare const API_URL: string;

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL + '/playlist';

  public getUserPlaylists(filters?: PlaylistFilters): Observable<Playlist[]> {
    let params = new HttpParams();

    if (filters?.name) params = params.set('name', filters.name);
    if (filters?.page) params = params.set('page', filters.page.toString());
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.orderBy) params = params.set('orderBy', filters.orderBy);

    return this.http.get<Playlist[]>(this.apiUrl, { params });
  }

  public getPlaylistById(id: string): Observable<Playlist> {
    return this.http.get<Playlist>(`${this.apiUrl}/${id}`);
  }

  public createPlaylist(createDto: CreatePlaylistDto): Observable<Playlist> {
    return this.http.post<Playlist>(this.apiUrl, createDto);
  }

  public updatePlaylist(id: string, updateDto: UpdatePlaylistDto): Observable<Playlist> {
    return this.http.patch<Playlist>(`${this.apiUrl}/${id}`, updateDto);
  }

  public deletePlaylist(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  public updatePlaylistSongs(id: string, updateDto: UpdatePlaylistSongsDto): Observable<Playlist> {
    return this.http.patch<Playlist>(`${this.apiUrl}/${id}/songs`, updateDto);
  }

  public getPublicPlaylists(filters?: PlaylistFilters): Observable<Playlist[]> {
    let params = new HttpParams();

    if (filters?.name) params = params.set('name', filters.name);
    if (filters?.page) params = params.set('page', filters.page.toString());
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.orderBy) params = params.set('orderBy', filters.orderBy);

    return this.http.get<Playlist[]>(this.apiUrl, { params })
      .pipe(map(playlists => playlists.filter(playlist => playlist.isPublic)));
  }

  public addSongsToPlaylist(playlistId: string, songIds: string[]): Observable<Playlist> {
    return this.updatePlaylistSongs(playlistId, {
      action: 'add',
      songIds
    });
  }

  public removeSongsFromPlaylist(playlistId: string, songIds: string[]): Observable<Playlist> {
    return this.updatePlaylistSongs(playlistId, {
      action: 'remove',
      songIds
    });
  }

  public getPlaylistsContainingSong(songId: string): Observable<Playlist[]> {
    return this.http.get<Playlist[]>(this.apiUrl)
      .pipe(map(playlists => playlists.filter(playlist =>
        playlist.songs.includes(songId)
      )));
  }

  public duplicatePlaylist(playlistId: string, newName?: string): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.apiUrl}/${playlistId}/duplicate`, {
      name: newName
    });
  }
}
