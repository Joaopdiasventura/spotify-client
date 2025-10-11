import {
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Header } from '../../../../shared/components/header/header';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { SongService } from '../../../../core/services/song/song.service';
import { Song } from '../../../../core/models/song';
import { BehaviorSubject, combineLatest, filter, map, merge, of, scan, shareReplay, startWith, switchMap, take, takeUntil, timer, Observable, Subject } from 'rxjs';
import { AuthService } from '../../../../core/services/user/auth/auth.service';
import { PlaylistService } from '../../../../core/services/playlist/playlist.service';

@Component({
  selector: 'app-playlist-create-page',
  imports: [Header, ReactiveFormsModule, LucideAngularModule, AsyncPipe],
  templateUrl: './create-page.html',
  styleUrl: './create-page.scss',
})
export class CreatePage implements AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly platform = inject(PLATFORM_ID);
  private readonly songService = inject(SongService);
  private readonly authService = inject(AuthService);
  private readonly playlistService = inject(PlaylistService);

  @ViewChild('gridSongs') private gridEl?: ElementRef<HTMLElement>;
  @ViewChild('infiniteSentinel') private sentinelEl?: ElementRef<HTMLElement>;
  private observer?: IntersectionObserver;
  private destroy$ = new Subject<void>();

  public form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  public get f(): FormGroup['controls'] {
    return this.form.controls;
  }

  // selection state persisted across searches/pages
  private selectedIds = new Set<string>();
  public selectedCount = signal(0);

  private readonly search$ = new BehaviorSubject<string>('');
  private readonly page$ = new BehaviorSubject<number>(0);
  private readonly limit = 10;

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

  private readonly requestState$ = merge(
    this.params$.pipe(map(([, page]) => ({ page, loading: true }))),
    this.pageResult$.pipe(map(({ page }) => ({ page, loading: false })))
  ).pipe(shareReplay(1));

  private readonly isInitialLoading$ = this.requestState$.pipe(
    map((s) => s.loading && s.page === 0),
    shareReplay(1)
  );
  private readonly isMoreLoading$ = this.requestState$.pipe(
    map((s) => s.loading && s.page > 0),
    shareReplay(1)
  );
  public readonly loadingInitial$ = this.applyLoadingDelay(this.isInitialLoading$, 150);
  public readonly loadingMore$ = this.applyLoadingDelay(this.isMoreLoading$, 150);

  private readonly hasMore$ = this.pageResult$.pipe(
    map((r) => r.list.length >= this.limit),
    startWith(true),
    shareReplay(1)
  );

  public onSearchChange(value: string): void {
    this.search$.next(value);
    this.page$.next(0);
  }

  public ngAfterViewInit(): void {
    this.setupObserver();
  }

  public ngOnDestroy(): void {
    this.observer?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
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

  public isSelected(song: Song): boolean {
    return this.selectedIds.has(song._id);
  }

  public onToggleSelect(song: Song, checked: boolean): void {
    if (checked) this.selectedIds.add(song._id);
    else this.selectedIds.delete(song._id);
    this.selectedCount.set(this.selectedIds.size);
  }

  public cancel(): void {
    this.router.navigate(['/user']);
  }

  public submit(): void {
    if (this.form.invalid || this.selectedIds.size === 0) return;
    const name = String(this.form.value.name || '').trim();
    if (!name) return;
    this.authService.user$.pipe(take(1)).subscribe((user) => {
      if (!user) return;
      const songs = Array.from(this.selectedIds);
      this.playlistService
        .create({ user: user._id, name, songs })
        .pipe(take(1))
        .subscribe(() => this.router.navigate(['/user']));
    });
  }

  public formatDuration(total: number): string {
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = Math.floor(total % 60);
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    return hours > 0
      ? `${hours.toString().padStart(2, '0')}:${mm}:${ss}`
      : `${mm}:${ss}`;
  }
}
