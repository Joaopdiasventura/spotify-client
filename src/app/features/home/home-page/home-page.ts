import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { Song } from '../../../core/models/song';
import { Header } from '../../../shared/components/header/header';
import { SongCard } from '../../../shared/components/song-card/song-card';
import { Player } from '../../../shared/components/player/player';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { SongService } from '../../../core/services/song/song.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular'; // Adicionado import

@Component({
  selector: 'app-home-page',
  imports: [Header, SongCard, Player, Sidebar, LucideAngularModule], // Adicionado LucideAngularModule
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit, OnDestroy {
  public currentIndex = signal<number>(-1);
  public isPlaying = signal(false);
  public sidebarOpen = signal(false);
  public songs = signal<Song[]>([]);
  public isLoading = signal(false);
  public searchQuery = signal<string>('');

  private readonly songService = inject(SongService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  public ngOnInit(): void {
    this.loadRecentSongs();

    // Configurar busca com debounce
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          this.isLoading.set(true);
          return this.songService.searchSongs(query);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (songs) => {
          this.songs.set(songs);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRecentSongs(): void {
    this.isLoading.set(true);
    this.songService.findMany({ limit: 20, page: 0, orderBy: 'createdAt:-1' }).subscribe({
      next: (songs) => {
        this.songs.set(songs);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  public onSearch(query: string): void {
    this.searchQuery.set(query);

    if (!query.trim()) {
      this.loadRecentSongs();
      return;
    }

    this.searchSubject.next(query);
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
