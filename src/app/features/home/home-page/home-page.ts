import { Component, inject, OnInit, signal } from '@angular/core';
import { Song } from '../../../core/models/song';
import { Header } from '../../../shared/components/header/header';
import { SongCard } from '../../../shared/components/song-card/song-card';
import { Player } from '../../../shared/components/player/player';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { SongService } from '../../../core/services/song/song.service';

@Component({
  selector: 'app-home-page',
  imports: [Header, SongCard, Player, Sidebar],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit {
  public currentIndex = signal<number>(-1);
  public isPlaying = signal(false);
  public sidebarOpen = signal(false);

  public songs = signal<Song[]>([]);

  private readonly songService = inject(SongService);

  public ngOnInit(): void {
    this.songService
      .findMany({ limit: 20, page: 0, orderBy: 'createdAt:-1' })
      .subscribe((songs) => this.songs.set(songs));
  }

  public handlePlay(index: number): void {
    if (index < 0 || index >= this.songs().length) return;
    if (this.currentIndex() == index) this.isPlaying.update((prev) => !prev);
    else {
      this.currentIndex.set(index);
      this.isPlaying.set(true);
    }
  }

  public handlePlayPause(): void {
    this.isPlaying.update((prev) => !prev);
  }

  public openSidebar(): void {
    this.sidebarOpen.set(true);
  }

  public closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
