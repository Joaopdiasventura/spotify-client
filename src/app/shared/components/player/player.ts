import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  signal,
  inject,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { Song } from '../../../core/models/song';
import { SongChunk } from '../../../core/models/song-chunk';
import { SongChunkService } from '../../../core/services/song-chunk/song-chunk.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-player',
  imports: [LucideAngularModule, NgClass],
  templateUrl: './player.html',
  styleUrls: ['./player.scss'],
})
export class Player implements OnInit, AfterViewInit, OnChanges {
  @Input({ required: true }) public playlist: Song[] | null = null;
  @Input({ required: true }) public currentIndex = -1;
  @Input({ required: true }) public isPlaying = false;
  @Output() public playEvent = new EventEmitter<number>();
  @Output() public closeEvent = new EventEmitter<void>();
  @Output() public loadMore = new EventEmitter<void>();

  @ViewChild('audio', { static: true }) public audioRef!: ElementRef<HTMLAudioElement>;

  private readonly platform = inject(PLATFORM_ID);
  private readonly songChunkService = inject(SongChunkService);

  public audio!: HTMLAudioElement;
  public mediaSource!: MediaSource;
  public sourceBuffer!: SourceBuffer;

  public chunks: SongChunk[] = [];
  public currentChunkIndex = 0;

  public currentTime = signal(0);
  public volume = signal(1);
  public shuffle = signal(false);
  public loop = signal(false);

  private order: number[] = [];
  private chunkDurations: number[] = [];
  private chunkStarts: number[] = [];
  private totalDuration = 0;
  private nextAppendScheduled = false;

  private seekThreshold = 1.25;
  private isSeeking = false;
  private seekTargetTime = 0;
  private objectUrl: string | null = null;
  private firstAppendDone = false;
  private pendingAdvanceAfterLoad = false;
  private lastPlaylistLength = 0;
  private noMoreAfterLoad = false;

  // Concurrency/session control fields
  private sessionId = 0;
  private activeFetchControllers = new Set<AbortController>();
  private chunksSub?: Subscription;
  private scheduledTimeUpdateHandlers = new Set<(ev: Event) => void>();

  public get currentSong(): Song | null {
    if (!this.playlist) return null;
    return this.currentIndex >= 0 && this.currentIndex < this.playlist.length
      ? this.playlist[this.currentIndex]
      : null;
  }

  public ngOnInit(): void {
    if (!isPlatformBrowser(this.platform)) return;
  }

  public ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platform)) return;
    this.audio = this.audioRef.nativeElement;
    this.audio.volume = this.volume();
    this.audio.addEventListener('timeupdate', () => this.currentTime.set(this.audio.currentTime));
    this.audio.addEventListener('ended', () => this.onAudioEnded());
    this.createMediaPipeline(0, this.sessionId);
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['playlist']) {
      this.rebuildOrder();
      const len = this.playlist?.length ?? 0;
      if (this.pendingAdvanceAfterLoad) {
        if (len > this.lastPlaylistLength) {
          // Novos itens chegaram; tenta avançar
          this.noMoreAfterLoad = false;
          const nextIdx = this.computeNextIndex();
          if (nextIdx != null) {
            this.pendingAdvanceAfterLoad = false;
            this.playEvent.emit(nextIdx);
            this.lastPlaylistLength = len;
            return;
          }
        } else {
          // Nada novo chegou
          this.noMoreAfterLoad = true;
          this.pendingAdvanceAfterLoad = false;
        }
      } else {
        // Reinicia flag quando playlist cresce sem estar pendente
        if (len > this.lastPlaylistLength) this.noMoreAfterLoad = false;
      }
      this.lastPlaylistLength = len;
    }
    if ((changes['playlist'] || changes['currentIndex']) && isPlatformBrowser(this.platform))
      if (this.currentSong) this.handleSongChange();
  }

  public onPlayPause(): void {
    if (!this.audio || !this.audio.src) return;
    if (this.audio.paused) {
      this.audio.play();
      this.isPlaying = true;
    } else {
      this.audio.pause();
      this.isPlaying = false;
    }
    this.playEvent.emit(this.currentIndex);
  }

  public onSeek(t: number): void {
    if (!this.audio) return;
    const time = Math.max(0, Math.min(t, this.totalDuration || t));
    const delta = Math.abs(time - this.audio.currentTime);
    const idx = this.findChunkByTime(time);
    const curIdx = this.findChunkByTime(this.audio.currentTime);
    if (delta > this.seekThreshold || idx !== curIdx) {
      this.hardSeek(time);
      return;
    }
    this.audio.currentTime = time;
  }

  public onVolumeChange(v: number): void {
    const vol = Math.min(Math.max(v, 0), 1);
    this.volume.set(vol);
    if (this.audio) this.audio.volume = vol;
  }

  public toggleShuffle(): void {
    this.shuffle.set(!this.shuffle());
    this.rebuildOrder();
  }

  public toggleLoop(): void {
    this.loop.update((p) => !p);
  }

  public formatTime(time: number): string {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Fechar o player
  public onClose(): void {
    // Para a reprodução
    if (this.audio) {
      this.audio.pause();
      this.isPlaying = false;
    }

    // Limpa os recursos
    this.teardownMediaPipeline();

    // Emite o evento para o componente pai
    this.closeEvent.emit();
  }

  private handleSongChange(): void {
    if (!this.currentSong) return;
    // Bump session and cancel any pending work to avoid race conditions
    this.sessionId++;
    this.cancelPendingWork();
    this.teardownMediaPipeline();
    this.loadChunks(this.currentSong._id, 0, this.sessionId);
  }

  private rebuildOrder(): void {
    if (!this.playlist) return;
    const n = this.playlist.length;
    if (n === 0) {
      this.order = [];
      return;
    }
    if (!this.shuffle()) {
      this.order = Array.from({ length: n }, (_, i) => i);
      return;
    }
    const rest: number[] = [];
    for (let i = 0; i < n; i++) if (i !== this.currentIndex) rest.push(i);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    this.order = [this.currentIndex, ...rest];
  }

  private computeNextIndex(): number | null {
    if (!this.playlist || !this.playlist.length) return null;
    if (!this.shuffle()) {
      const next = this.currentIndex + 1;
      if (next < this.playlist.length) return next;
      if (this.loop()) return 0;
      return null;
    }
    const pos = this.order.indexOf(this.currentIndex);
    if (pos < 0) return null;
    const nextPos = pos + 1;
    if (nextPos < this.order.length) return this.order[nextPos];
    if (this.loop()) return this.order[0];
    return null;
  }

  private computePrevIndex(): number | null {
    if (!this.playlist || !this.playlist.length) return null;
    if (!this.shuffle()) {
      const prev = this.currentIndex - 1;
      if (prev >= 0) return prev;
      if (this.loop()) return this.playlist.length - 1;
      return null;
    }
    const pos = this.order.indexOf(this.currentIndex);
    if (pos < 0) return null;
    const prevPos = pos - 1;
    if (prevPos >= 0) return this.order[prevPos];
    if (this.loop()) return this.order[this.order.length - 1];
    return null;
  }

  public get canNext(): boolean {
    if (this.computeNextIndex() !== null) return true;
    if (this.pendingAdvanceAfterLoad) return false;
    return !this.noMoreAfterLoad;
  }

  public get canPrev(): boolean {
    if (!this.audio) return this.computePrevIndex() !== null;
    // allow going to start when > 3s
    if (this.audio.currentTime > 3) return true;
    return this.computePrevIndex() !== null;
  }

  public onPrev(): void {
    if (!this.playlist || !this.playlist.length || !this.audio) return;
    if (this.audio.currentTime > 3) {
      this.onSeek(0);
      return;
    }
    const newIndex = this.computePrevIndex();
    if (newIndex === null) return;
    this.playEvent.emit(newIndex);
  }

  public onNext(): void {
    if (!this.playlist || !this.playlist.length) return;
    const newIndex = this.computeNextIndex();
    if (newIndex == null) {
      // Sem próxima música disponível; tenta auto-carregar
      if (!this.pendingAdvanceAfterLoad && !this.noMoreAfterLoad) {
        this.pendingAdvanceAfterLoad = true;
        this.lastPlaylistLength = this.playlist?.length ?? 0;
        this.loadMore.emit();
      }
      return;
    }
    this.playEvent.emit(newIndex);
  }

  private onAudioEnded(): void {
    const hadNext = ((): boolean => {
      if (!this.playlist || !this.playlist.length) return false;
      if (this.shuffle()) return this.playlist.length > 1;
      if (this.currentIndex + 1 < this.playlist.length) return true;
      return this.loop();
    })();
    if (hadNext) this.onNext();
    else {
      this.isPlaying = false;
      // Auto-load quando acabar sem próxima
      if (!this.pendingAdvanceAfterLoad && !this.noMoreAfterLoad) {
        this.pendingAdvanceAfterLoad = true;
        this.lastPlaylistLength = this.playlist?.length ?? 0;
        this.loadMore.emit();
      }
    }
  }

  private createMediaPipeline(seekTo: number, session: number): void {
    this.mediaSource = new MediaSource();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(this.mediaSource);
    this.audio.src = this.objectUrl;
    this.firstAppendDone = false;
    this.mediaSource.addEventListener(
      'sourceopen',
      () => {
        if (session !== this.sessionId) return;
        this.mediaSource.duration = this.totalDuration || 1e6;
        this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
        this.sourceBuffer.mode = 'sequence';
        this.sourceBuffer.addEventListener('updateend', () => {
          if (session !== this.sessionId) return;
          if (!this.firstAppendDone) {
            this.firstAppendDone = true;
            const safe = Math.max(seekTo, (this.chunkStarts[this.currentChunkIndex] ?? 0) + 0.01);
            try {
              this.audio.currentTime = safe;
            } finally {
              if (this.isPlaying) this.audio.play();
              this.scheduleNextAppend(this.currentChunkIndex, session);
            }
          } else {
            const next = this.currentChunkIndex + 1;
            if (next < this.chunks.length) this.scheduleNextAppend(this.currentChunkIndex, session);
            else this.mediaSource.endOfStream();
          }
        });
        const idx = this.findChunkByTime(seekTo);
        this.currentChunkIndex = idx;
        const offset = this.chunkStarts[idx] ?? 0;
        try {
          this.sourceBuffer.timestampOffset = offset;
        } finally {
          this.appendChunk(idx, session);
        }
      },
      { once: true }
    );
  }

  private teardownMediaPipeline(): void {
    // cancel pending work and listeners
    this.cancelPendingWork();
    try {
      if (this.sourceBuffer && this.sourceBuffer.updating) this.sourceBuffer.abort();
    } catch {
      // ignore
    }
    try {
      if (this.mediaSource && this.mediaSource.readyState !== 'closed')
        this.mediaSource.endOfStream();
    } catch {
      // ignore
    }
    this.nextAppendScheduled = false;
    this.firstAppendDone = false;
    try {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    } catch {}
    this.objectUrl = null;
    try {
      if (this.audio) this.audio.removeAttribute('src');
    } catch {}
  }

  private hardSeek(time: number): void {
    if (!this.mediaSource) return;
    this.isSeeking = true;
    this.seekTargetTime = time;
    const wasPlaying = this.isPlaying;
    this.isPlaying = wasPlaying;
    if (!this.audio.paused) this.audio.pause();
    this.teardownMediaPipeline();
    this.createMediaPipeline(time, this.sessionId);
  }

  private loadChunks(songId: string, seekTo: number, session: number): void {
    try { this.chunksSub?.unsubscribe(); } catch {}
    this.chunksSub = this.songChunkService.findAllBySong(songId).subscribe({
      next: async (chunks: SongChunk[]) => {
        if (session !== this.sessionId) return;
        this.chunks = chunks;
        this.chunkDurations = chunks.map((c) => c.duration);
        if (!this.chunkDurations.every((v) => v > 0)) this.chunkDurations = chunks.map(() => 5);
        this.chunkStarts = [];
        let acc = 0;
        for (const duration of this.chunkDurations) {
          this.chunkStarts.push(acc);
          acc += duration;
        }
        this.totalDuration = acc;
        this.currentChunkIndex = this.findChunkByTime(seekTo);
        this.createMediaPipeline(seekTo, session);
      },
    });
  }

  private scheduleNextAppend(prevIndex: number, session: number): void {
    if (this.nextAppendScheduled) return;
    const next = prevIndex + 1;
    if (next >= this.chunks.length) return;
    this.nextAppendScheduled = true;
    const threshold =
      (this.chunkStarts[prevIndex] ?? 0) + (this.chunkDurations[prevIndex] ?? 0) * 0.55;
    const fn = (): void => {
      if (session !== this.sessionId) {
        try { this.audio.removeEventListener('timeupdate', fn); } catch {}
        this.scheduledTimeUpdateHandlers.delete(fn);
        return;
      }
      if (this.audio.currentTime >= threshold) {
        this.audio.removeEventListener('timeupdate', fn);
        this.scheduledTimeUpdateHandlers.delete(fn);
        this.nextAppendScheduled = false;
        this.appendChunk(next, session);
        this.currentChunkIndex = next;
      }
    };
    if (this.audio.currentTime >= threshold) {
      this.nextAppendScheduled = false;
      this.appendChunk(next, session);
      this.currentChunkIndex = next;
    } else {
      this.audio.addEventListener('timeupdate', fn);
      this.scheduledTimeUpdateHandlers.add(fn);
    }
  }

  private async appendChunk(index: number, session: number): Promise<void> {
    if (!this.mediaSource || index >= this.chunks.length) return;
    if (session !== this.sessionId) return;
    const chunk = this.chunks[index];
    const controller = new AbortController();
    this.activeFetchControllers.add(controller);
    let buf: ArrayBuffer | null = null;
    try {
      const res = await fetch(chunk.url, { signal: controller.signal });
      buf = await res.arrayBuffer();
    } catch {
      this.activeFetchControllers.delete(controller);
      return;
    }
    this.activeFetchControllers.delete(controller);
    if (session !== this.sessionId) return;
    if (!this.sourceBuffer) return;
    await this.waitNotUpdating(session);
    try {
      if (!buf) return;
      if (!this.mediaSource || this.mediaSource.readyState !== 'open') return;
      this.sourceBuffer.appendBuffer(buf);
    } catch {
      return;
    }
  }

  private waitNotUpdating(session: number): Promise<void> {
    if (session !== this.sessionId) return Promise.resolve();
    if (!this.sourceBuffer) return Promise.resolve();
    if (!this.sourceBuffer.updating) return Promise.resolve();
    return new Promise((resolve) => {
      const h = (): void => {
        if (session !== this.sessionId) {
          try { this.sourceBuffer.removeEventListener('updateend', h); } catch {}
          resolve();
          return;
        }
        if (!this.sourceBuffer.updating) {
          this.sourceBuffer.removeEventListener('updateend', h);
          resolve();
        }
      };
      this.sourceBuffer.addEventListener('updateend', h);
    });
  }

  private findChunkByTime(t: number): number {
    if (!this.chunkStarts.length) return 0;
    for (let i = this.chunkStarts.length - 1; i >= 0; i--) {
      const s = this.chunkStarts[i] ?? 0;
      const e = s + (this.chunkDurations[i] ?? 0);
      if (t >= s && t < e) return i;
    }
    return Math.max(0, this.chunkStarts.length - 1);
  }

  private cancelPendingWork(): void {
    try { this.chunksSub?.unsubscribe(); } catch {}
    this.chunksSub = undefined;
    for (const c of this.activeFetchControllers) {
      try { c.abort(); } catch {}
    }
    this.activeFetchControllers.clear();
    try {
      if (this.audio) {
        for (const fn of this.scheduledTimeUpdateHandlers) {
          try { this.audio.removeEventListener('timeupdate', fn); } catch {}
        }
      }
    } catch {}
    this.scheduledTimeUpdateHandlers.clear();
    this.nextAppendScheduled = false;
  }
}
