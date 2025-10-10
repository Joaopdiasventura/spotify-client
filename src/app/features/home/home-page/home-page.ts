import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Song } from '../../../core/models/song';
import { Header } from '../../../shared/components/header/header';
import { SongCard } from '../../../shared/components/song-card/song-card';
import { Player } from '../../../shared/components/player/player';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { SongService } from '../../../core/services/song/song.service';
import {
  BehaviorSubject,
  combineLatest,
  map,
  merge,
  scan,
  shareReplay,
  startWith,
  switchMap,
  take,
} from 'rxjs';

@Component({
  selector: 'app-home-page',
  imports: [Header, SongCard, Player, Sidebar, AsyncPipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnDestroy {
  public currentIndex = signal<number>(-1);
  public isPlaying = signal(false);
  public sidebarOpen = signal(false);

  public skeletons = Array.from({ length: 5 }, (_, i) => i);

  private readonly songService = inject(SongService);
  private readonly platform = inject(PLATFORM_ID);

  private readonly search$ = new BehaviorSubject<string>('');
  private readonly page$ = new BehaviorSubject<number>(0);
  private readonly limit = 10;
  private observer?: IntersectionObserver;

  private readonly params$ = combineLatest([this.search$, this.page$]).pipe(shareReplay(1));

  private readonly pageResult$ = this.params$.pipe(
    switchMap(([search, page]) =>
      this.songService
        .findMany({
          limit: this.limit,
          title: search,
          artist: search,
          page,
          orderBy: search ? 'title:asc' : 'createdAt:desc',
        })
        .pipe(map((list) => ({ page, list })))
    ),
    shareReplay(1)
  );

  public readonly songs$ = this.pageResult$.pipe(
    scan<{ page: number; list: Song[] }, Song[]>(
      (acc, cur) => (cur.page === 0 ? cur.list : [...acc, ...cur.list]),
      []
    ),
    shareReplay(1)
  );

  public readonly loading$ = merge(
    this.params$.pipe(map(() => true)),
    this.pageResult$.pipe(map(() => false))
  ).pipe(startWith(false), shareReplay(1));

  private readonly hasMore$ = this.pageResult$.pipe(
    map((r) => r.list.length >= this.limit),
    startWith(true),
    shareReplay(1)
  );

  public readonly label$ = combineLatest([this.songs$, this.search$]).pipe(
    map(([songs, search]) => {
      if (!songs || songs.length === 0) return 'Nenhuma musica encontrada';
      if (search) return 'Exibindo resultados para: ' + search;
      return 'Adicionadas recentemente';
    })
  );

  private gridEl?: ElementRef<HTMLDivElement>;
  private sentinelEl?: ElementRef<HTMLDivElement>;

  @ViewChild('gridCards')
  public set gridCards(el: ElementRef<HTMLDivElement> | undefined) {
    this.gridEl = el;
    this.setupObserver();
  }

  @ViewChild('infiniteSentinel')
  public set infiniteSentinel(el: ElementRef<HTMLDivElement> | undefined) {
    this.sentinelEl = el;
    this.setupObserver();
  }

  public handlePlay(index: number): void {
    this.songs$.pipe(take(1)).subscribe((list) => {
      if (!list || index < 0 || index >= list.length) return;
      if (this.currentIndex() === index) this.isPlaying.update((v) => !v);
      else {
        this.currentIndex.set(index);
        this.isPlaying.set(true);
      }
    });
  }

  public onPlayerClose(): void {
    this.currentIndex.set(-1);
    this.isPlaying.set(false);
  }

  public handlePlayPause(): void {
    this.isPlaying.update((v) => !v);
  }

  public changeSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  public onSearchChange(value: string): void {
    this.search$.next(value);
    this.page$.next(0);
  }

  public ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  public handlePlayerLoadMore(): void {
    this.loadMore();
  }

  private setupObserver(): void {
    if (!isPlatformBrowser(this.platform)) return;
    if (!this.gridEl || !this.sentinelEl) return;
    if (this.observer) this.observer.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;
        this.loadMore();
      },
      { root: this.gridEl.nativeElement, rootMargin: '0px 0px 200px 0px', threshold: 0.1 }
    );
    this.observer.observe(this.sentinelEl.nativeElement);
  }

  private loadMore(): void {
    combineLatest([this.loading$, this.hasMore$])
      .pipe(take(1))
      .subscribe(([loading, hasMore]) => {
        if (!loading && hasMore) this.page$.next(this.page$.getValue() + 1);
      });
  }
}
