import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { Header } from '../../../shared/components/header/header';
import { SongCard } from '../../../shared/components/song-card/song-card';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { PlaylistService } from '../../../core/services/playlist/playlist.service';
import { switchMap, map, shareReplay } from 'rxjs';
import { Song } from '../../../core/models/song';
import { Playlist } from '../../../core/models/playlist';
import { PlayerService } from '../../../shared/services/player/player.service';
import { PlayerConfig } from '../../../shared/interfaces/config/player';

@Component({
  selector: 'app-playlist-page',
  imports: [Header, SongCard, Sidebar, AsyncPipe],
  templateUrl: './playlist-page.html',
  styleUrl: './playlist-page.scss',
})
export class PlaylistPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly playlistService = inject(PlaylistService);
  private readonly playerService = inject(PlayerService);
  public sidebarOpen = signal(false);

  public currentPlayerConfig: PlayerConfig = {
    playlist: [],
    currentIndex: -1,
    isPlaying: false,
    playEvent: this.handlePlayerIndexChange.bind(this),
    closeEvent: this.onPlayerClose.bind(this),
    playingChange: this.onPlayingChange.bind(this),
    loadMore: () => {
      return;
    },
  };

  public readonly playlist$ = this.route.paramMap.pipe(
    switchMap((params) => this.playlistService.findById(params.get('id') || '')),
    shareReplay(1)
  );

  public readonly songs$ = this.playlist$.pipe(
    map((playlist: Playlist) => playlist?.songs ?? []),
    shareReplay(1)
  );

  public ngOnInit(): void {
    this.playerService.player$.subscribe((data) => {
      if (data) this.currentPlayerConfig = data;
    });
  }

  public changeSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  public onPlayAll(index: number): void {
    this.songs$.pipe(map((list) => list || [])).subscribe((list) => {
      this.playerService.updatePlayerData({
        playlist: list,
        currentIndex: index,
        isPlaying: true,
        playEvent: this.handlePlayerIndexChange.bind(this),
        closeEvent: this.onPlayerClose.bind(this),
        playingChange: this.onPlayingChange.bind(this),
        loadMore: () => {
          return;
        },
      });
    });
  }

  public handlePlayerIndexChange(index: number): void {
    const list = this.currentPlayerConfig.playlist;
    if (!list || index < 0 || index >= list.length) return;
    if (this.currentPlayerConfig.currentIndex === index)
      this.playerService.updatePlayerData({
        ...this.currentPlayerConfig,
        isPlaying: !this.currentPlayerConfig.isPlaying,
      });
    else {
      this.playerService.updatePlayerData({
        ...this.currentPlayerConfig,
        currentIndex: index,
        isPlaying: true,
      });
    }
  }

  public onPlayerClose(): void {
    this.playerService.updatePlayerData({
      ...this.currentPlayerConfig,
      currentIndex: -1,
      isPlaying: false,
    });
  }

  public onPlayingChange(playing: boolean): void {
    this.playerService.updatePlayerData({
      ...this.currentPlayerConfig,
      isPlaying: playing,
    });
  }

  public isCurrentSong(song: Song): boolean {
    if (!song) return false;
    const list = this.currentPlayerConfig.playlist!;
    const idx = this.currentPlayerConfig.currentIndex;
    if (idx < 0 || idx >= list.length) return false;
    return list[idx]?._id === song._id;
  }
}
