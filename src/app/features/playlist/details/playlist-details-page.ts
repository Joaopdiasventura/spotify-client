import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, map, switchMap, shareReplay, of } from 'rxjs';

import { Song } from '../../../core/models/song';
import {
  Playlist,
  getPlaylistOwnerName,
  getPlaylistSongs,
  getSongId,
  getSongTitle,
  getSongArtist,
  getSongThumbnail,
  getSongDescription,
  getSongDuration,
  PlaylistSong,
} from '../../../core/models/playlist';
import { Header } from '../../../shared/components/header/header';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { Player } from '../../../shared/components/player/player';
import { PlaylistService } from '../../../core/services/playlist/playlist.service';

@Component({
  selector: 'app-playlist-details-page',
  standalone: true,
  imports: [CommonModule, FormsModule, Header, Sidebar, Player],
  templateUrl: './playlist-details-page.html',
  styleUrl: './playlist-details-page.scss',
})
export class PlaylistDetailsPage implements OnInit {
  private readonly playlistService = inject(PlaylistService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public sidebarOpen = signal(false);
  public currentIndex = signal<number>(-1);
  public isPlaying = signal(false);
  public playerPlaylist = signal<Song[]>([]);

  public skeletons = Array.from({ length: 8 }, (_, i) => i);

  public playlist$: Observable<Playlist | null>;

  public constructor() {
    this.playlist$ = this.route.params.pipe(
      switchMap((params) => {
        const playlistId = params['id'];
        if (!playlistId) return of(null);

        return this.playlistService.getPlaylistById(playlistId).pipe(
          map((playlist) => {
            return playlist;
          })
        );
      }),
      shareReplay(1)
    );
  }

  public ngOnInit(): void {
    this.playlist$.subscribe((playlist) => {
      if (playlist) {
        const songs = this.getSongs(playlist);

        if (songs.length > 0) {
          this.playerPlaylist.set(songs);
        }
      } else {
        console.log('❌ Playlist é null/undefined');
      }
    });
  }

  public getSongs(playlist: Playlist): Song[] {
    return getPlaylistSongs(playlist);
  }

  public getSongsCount(playlist: Playlist): number {
    return playlist.songs?.length || 0;
  }

  public getSongId(song: PlaylistSong, index: number): string {
    return getSongId(song, index);
  }

  public getSongTitle(song: PlaylistSong): string {
    return getSongTitle(song);
  }

  public getSongArtist(song: PlaylistSong): string {
    return getSongArtist(song);
  }

  public getSongThumbnail(song: PlaylistSong): string | null {
    return getSongThumbnail(song);
  }

  public getSongDescription(song: PlaylistSong): string | null {
    return getSongDescription(song);
  }

  public getSongDuration(song: PlaylistSong): number {
    return getSongDuration(song);
  }

  public getUserName(playlist: Playlist): string {
    return getPlaylistOwnerName(playlist);
  }

  public playPlaylist(): void {
    this.playlist$.subscribe((playlist) => {
      if (playlist) {
        const songs = this.getSongs(playlist);
        if (songs.length > 0) {
          this.playerPlaylist.set(songs);
          this.currentIndex.set(0);
          this.isPlaying.set(true);
        }
      }
    });
  }

  public playSong(index: number): void {
    const songs = this.playerPlaylist();
    if (songs.length > 0 && index >= 0 && index < songs.length) {
      if (this.currentIndex() === index) {
        this.isPlaying.update((playing) => !playing);
      } else {
        this.currentIndex.set(index);
        this.isPlaying.set(true);
      }
    }
  }

  public isCurrentSong(song: Song): boolean {
    if (!song) return false;
    const list = this.playerPlaylist();
    const idx = this.currentIndex();
    if (idx < 0 || idx >= list.length) return false;
    return list[idx]?._id === song._id;
  }

  public formatDuration(duration: number): string {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  public goBack(): void {
    this.router.navigate(['/profile']);
  }

  public changeSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  public onSearchChange(value: string): void {
    console.log('Valor da pesquisa:', value);
  }

  public handlePlayerIndexChange(index: number): void {
    const list = this.playerPlaylist();
    if (!list || index < 0 || index >= list.length) return;

    if (this.currentIndex() === index) {
      this.isPlaying.update((v) => !v);
    } else {
      this.currentIndex.set(index);
      this.isPlaying.set(true);
    }
  }

  public onPlayerClose(): void {
    this.currentIndex.set(-1);
    this.isPlaying.set(false);
  }

  public onPlayingChange(playing: boolean): void {
    this.isPlaying.set(playing);
  }

  public handlePlayerLoadMore(): void {
    // Implementar carregamento de mais músicas se necessário
  }
}
