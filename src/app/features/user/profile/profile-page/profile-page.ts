import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Song } from '../../../../core/models/song';
import { Playlist } from '../../../../core/models/playlist';
import { User } from '../../../../core/models/user';
import { Header } from '../../../../shared/components/header/header';
import { SongCard } from '../../../../shared/components/song-card/song-card';
import { PlaylistCard } from '../../../../shared/components/playlist-card/playlist-card';
import { Player } from '../../../../shared/components/player/player';
import { Sidebar } from '../../../../shared/components/sidebar/sidebar';
import { SongService } from '../../../../core/services/song/song.service';
import { PlaylistService } from '../../../../core/services/playlist/playlist.service';
import { AuthService } from '../../../../core/services/user/auth/auth.service';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  merge,
  scan,
  shareReplay,
  startWith,
  switchMap,
  take,
  of,
  timer,
  filter,
  distinctUntilChanged,
  takeUntil,
} from 'rxjs';

@Component({
  selector: 'app-profile-page',
  imports: [Header, SongCard, PlaylistCard, Player, Sidebar, AsyncPipe],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage implements OnDestroy {
  public currentIndex = signal<number>(-1);
  public isPlaying = signal(false);
  public sidebarOpen = signal(false);
  public playerPlaylist = signal<Song[]>([]);
  private playerSearchSnapshot = '';

  public skeletons = Array.from({ length: 5 }, (_, i) => i);

  private readonly songService = inject(SongService);
  private readonly playlistService = inject(PlaylistService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platform = inject(PLATFORM_ID);

  private readonly search$ = new BehaviorSubject<string>('');
  private readonly page$ = new BehaviorSubject<number>(0);
  private readonly limit = 10;
  private observer?: IntersectionObserver;

  public readonly user$ = this.authService.user$;
  private currentUser = signal<User | null>(null);

  public constructor() {
    this.user$.subscribe((user) => {
      this.currentUser.set(user);
    });
  }

  private readonly userSongsParams$ = combineLatest([this.search$, this.page$, this.user$]).pipe(
    shareReplay(1)
  );

  private readonly userSongsPageResult$ = this.userSongsParams$.pipe(
    switchMap(([search, page, user]) => {
      if (!user) return of({ page, list: [] as Song[] });

      return this.songService
        .findMany({
          limit: this.limit,
          title: search,
          artist: search,
          page,
          orderBy: search ? 'title:asc' : 'createdAt:desc',
        })
        .pipe(
          map((list: Song[]) => {
            const userSongs = list.filter((song) => {
              const isUserSong = song.user === user._id;
              return isUserSong;
            });

            return { page, list: userSongs };
          })
        );
    }),
    shareReplay(1)
  );

  public readonly userSongs$ = this.userSongsPageResult$.pipe(
    scan<{ page: number; list: Song[] }, Song[]>(
      (acc, cur) => (cur.page === 0 ? cur.list : [...acc, ...cur.list]),
      []
    ),
    shareReplay(1)
  );

  public readonly userPlaylists$ = combineLatest([
    this.playlistService.getUserPlaylists(),
    this.user$,
  ]).pipe(
    map(([playlists, user]) => {
      if (!user) return [];
      return playlists.filter((playlist) => playlist.owner === user._id);
    }),
    shareReplay(1)
  );

  private readonly userSongsLoading$ = merge(
    this.userSongsParams$.pipe(map(() => true)),
    this.userSongsPageResult$.pipe(map(() => false))
  ).pipe(startWith(false), shareReplay(1));

  private readonly userSongsRequestState$ = merge(
    this.userSongsParams$.pipe(map(([, page]) => ({ page, loading: true }))),
    this.userSongsPageResult$.pipe(map(({ page }) => ({ page, loading: false })))
  ).pipe(shareReplay(1));

  private readonly isUserSongsInitialLoading$ = this.userSongsRequestState$.pipe(
    map((s) => s.loading && s.page === 0),
    distinctUntilChanged(),
    shareReplay(1)
  );

  private readonly isUserSongsMoreLoading$ = this.userSongsRequestState$.pipe(
    map((s) => s.loading && s.page > 0),
    distinctUntilChanged(),
    shareReplay(1)
  );

  public readonly loadingInitial$ = this.applyLoadingDelay(this.isUserSongsInitialLoading$, 150);
  public readonly loadingMore$ = this.applyLoadingDelay(this.isUserSongsMoreLoading$, 150);

  private readonly hasMore$ = this.userSongsPageResult$.pipe(
    map((r) => r.list.length >= this.limit),
    startWith(true),
    shareReplay(1)
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

  public handleCardPlay(index: number): void {
    this.userSongs$.pipe(take(1)).subscribe((list: Song[]) => {
      if (!list || index < 0 || index >= list.length) return;
      this.playerPlaylist.set([...list]);
      this.playerSearchSnapshot = this.search$.getValue();
      this.currentIndex.set(index);
      this.isPlaying.set(true);
    });
  }

  public handlePlayerIndexChange(index: number): void {
    const list = this.playerPlaylist();
    if (!list || index < 0 || index >= list.length) return;
    if (this.currentIndex() === index) this.isPlaying.update((v) => !v);
    else {
      this.currentIndex.set(index);
      this.isPlaying.set(true);
    }
  }

  public onPlayerClose(): void {
    this.currentIndex.set(-1);
    this.isPlaying.set(false);
  }

  public changeSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  public onSearchChange(value: string): void {
    this.search$.next(value);
    this.page$.next(0);
  }

  public onPlayingChange(playing: boolean): void {
    this.isPlaying.set(playing);
  }

  public createPlaylist(): void {
    this.router.navigate(['/playlists/create']);
  }

  public openPlaylist(playlist: Playlist): void {
    this.router.navigate(['/playlists', playlist._id]);
  }

  public ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  public handlePlayerLoadMore(): void {
    const snapshotSearch = this.playerSearchSnapshot;
    const orderBy = snapshotSearch ? 'title:asc' : 'createdAt:desc';
    const alreadyLoaded = this.playerPlaylist().length;
    const nextPage = Math.floor(alreadyLoaded / this.limit);
    this.songService
      .findMany({
        limit: this.limit,
        title: snapshotSearch,
        artist: snapshotSearch,
        page: nextPage,
        orderBy,
      })
      .pipe(take(1))
      .subscribe((list: Song[]) => {
        if (!list || list.length === 0) return;
        const currentUser = this.currentUser();
        const userSongs = list.filter((song) => song.user === currentUser?._id);
        const merged = [...this.playerPlaylist(), ...userSongs];
        this.playerPlaylist.set(merged);
      });
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
    combineLatest([this.userSongsLoading$, this.hasMore$])
      .pipe(take(1))
      .subscribe(([loading, hasMore]) => {
        if (!loading && hasMore) this.page$.next(this.page$.getValue() + 1);
      });
  }

  private applyLoadingDelay(source$: Observable<boolean>, delayMs: number): Observable<boolean> {
    return source$.pipe(
      switchMap((isLoading) =>
        isLoading
          ? timer(delayMs).pipe(
              map(() => true),
              takeUntil(source$.pipe(filter((v) => !v)))
            )
          : of(false)
      ),
      startWith(false),
      shareReplay(1)
    );
  }

  public isCurrentSong(song: Song): boolean {
    if (!song) return false;
    const list = this.playerPlaylist();
    const idx = this.currentIndex();
    if (idx < 0 || idx >= list.length) return false;
    return list[idx]?._id === song._id;
  }
}
