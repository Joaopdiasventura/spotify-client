import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  signal,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Song } from '../../../core/models/song';
import { SongChunkService } from '../../../core/services/song-chunk/song-chunk.service';
import { isPlatformBrowser } from '@angular/common';
import { SongChunk } from '../../../core/models/song-chunk';

@Component({
  selector: 'app-player',
  imports: [LucideAngularModule],
  templateUrl: './player.html',
  styleUrls: ['./player.scss'],
})
export class Player implements OnInit, OnChanges {
  @Input() public playlist: Song[] = [];
  @Input() public currentIndex = -1;
  @Input() public isPlaying = false;
  @Output() public playEvent = new EventEmitter<number>();

  private readonly platform = inject(PLATFORM_ID);
  private readonly songChunkService = inject(SongChunkService);

  public audio!: HTMLAudioElement;
  public mediaSource!: MediaSource;
  public sourceBuffer!: SourceBuffer;

  public chunks: SongChunk[] = [];
  public currentChunkIndex = 0;
  public isSourceBufferReady = false;
  public pendingFirstChunk = false;

  public currentTime = signal(0);
  public volume = signal(1);
  public shuffle = signal(false);
  public loop = signal(false); // loop all playlist when reaching end

  // Playback order mapping. Values are indices into `playlist`.
  private order: number[] = [];

  public get currentSong(): Song | null {
    return this.currentIndex >= 0 && this.currentIndex < this.playlist.length
      ? this.playlist[this.currentIndex]
      : null;
  }

  public ngOnInit(): void {
    if (!isPlatformBrowser(this.platform)) return;
    this.initMediaSource();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['playlist']) {
      this.rebuildOrder();
    }

    if ((changes['playlist'] || changes['currentIndex']) && isPlatformBrowser(this.platform))
      if (this.currentSong) this.handleSongChange();
  }

  public onPlayPause(): void {
    if (!this.audio.src) return;

    if (this.audio.paused) {
      this.audio.play().catch((err) => console.error('Erro ao reproduzir:', err));
      this.isPlaying = true;
    } else {
      this.audio.pause();
      this.isPlaying = false;
    }

    this.playEvent.emit(this.currentIndex);
  }

  public onSeek(time: number): void {
    if (this.audio && this.audio.duration)
      this.audio.currentTime = Math.min(Math.max(time, 0), this.audio.duration);
  }

  public onVolumeChange(volume: number): void {
    this.volume.set(Math.min(Math.max(volume, 0), 1));
    if (this.audio) this.audio.volume = this.volume();
  }

  public formatTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private initMediaSource(): void {
    this.audio = new Audio();
    this.audio.volume = this.volume();

    this.audio.addEventListener('timeupdate', () => this.currentTime.set(this.audio.currentTime));
    this.audio.addEventListener('ended', () => this.onAudioEnded());

    this.mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(this.mediaSource);

    this.mediaSource.addEventListener('sourceopen', () => {
      this.isSourceBufferReady = true;
      if (this.pendingFirstChunk && this.chunks.length) {
        this.appendChunk(this.currentChunkIndex);
        this.pendingFirstChunk = false;
      }
    });
  }

  public onPrev(): void {
    if (!this.playlist.length) return;
    if (!this.audio) return;

    if (this.audio.currentTime > 3) {
      this.onSeek(0);
      return;
    }

    const newIndex = this.computePrevIndex();
    if (newIndex === null) return;
    this.playEvent.emit(newIndex);
  }

  public onNext(): void {
    if (!this.playlist.length) return;

    const newIndex = this.computeNextIndex();
    if (newIndex === null) return;
    this.playEvent.emit(newIndex);
  }

  public toggleShuffle(): void {
    const nextState = !this.shuffle();
    this.shuffle.set(nextState);
    this.rebuildOrder();
  }

  public toggleLoop(): void {
    this.loop.update((prev) => !prev);
  }

  private onAudioEnded(): void {
    // Try advance to next based on settings; if not possible, stop playback
    const hadNext = ((): boolean => {
      if (!this.playlist.length) return false;
      if (this.shuffle()) return this.playlist.length > 1;
      if (this.currentIndex + 1 < this.playlist.length) return true;
      return this.loop();
    })();

    if (hadNext) this.onNext();
    else {
      // stop playback
      this.isPlaying = false;
      this.playEvent.emit(this.currentIndex); // notify parent to toggle off
    }
  }

  private handleSongChange(): void {
    if (!this.currentSong) return;

    this.stopPreviousSong();
    this.loadChunks(this.currentSong._id);
  }

  private rebuildOrder(): void {
    const n = this.playlist.length;
    if (n === 0) {
      this.order = [];
      return;
    }

    if (!this.shuffle()) {
      // identity order
      this.order = Array.from({ length: n }, (_, i) => i);
      return;
    }

    // Build a shuffled order that includes all indices exactly once.
    // Keep the current song at position 0 to avoid abrupt jump.
    const rest: number[] = [];
    for (let i = 0; i < n; i++) if (i !== this.currentIndex) rest.push(i);
    // Fisher–Yates
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    this.order = [this.currentIndex, ...rest];
  }

  private findOrderPos(index: number): number {
    if (!this.order.length) this.rebuildOrder();
    return this.order.indexOf(index);
  }

  private computeNextIndex(): number | null {
    if (!this.playlist.length) return null;
    if (!this.shuffle()) {
      const next = this.currentIndex + 1;
      if (next < this.playlist.length) return next;
      if (this.loop()) return 0;
      return null;
    }
    // shuffled order
    const pos = this.findOrderPos(this.currentIndex);
    if (pos < 0) return null;
    const nextPos = pos + 1;
    if (nextPos < this.order.length) return this.order[nextPos];
    if (this.loop()) return this.order[0];
    return null;
  }

  private computePrevIndex(): number | null {
    if (!this.playlist.length) return null;
    if (!this.shuffle()) {
      const prev = this.currentIndex - 1;
      if (prev >= 0) return prev;
      if (this.loop()) return this.playlist.length - 1;
      return null;
    }
    // shuffled order
    const pos = this.findOrderPos(this.currentIndex);
    if (pos < 0) return null;
    const prevPos = pos - 1;
    if (prevPos >= 0) return this.order[prevPos];
    if (this.loop()) return this.order[this.order.length - 1];
    return null;
  }

  private stopPreviousSong(): void {
    if (this.audio && !this.audio.paused) this.audio.pause();

    if (this.sourceBuffer) {
      try {
        if (!this.sourceBuffer.updating) this.sourceBuffer.abort();
      } catch (error) {
        console.warn('Erro ao limpar sourceBuffer:', error);
      }
      this.sourceBuffer = null as unknown as SourceBuffer;
    }

    if (this.mediaSource && this.mediaSource.readyState != 'closed') {
      try {
        this.mediaSource.endOfStream();
      } catch (error) {
        console.warn('Erro ao finalizar mediaSource:', error);
      }
    }

    this.chunks = [];
    this.currentChunkIndex = 0;
    this.isSourceBufferReady = false;
    this.pendingFirstChunk = true;

    this.currentTime.set(0);

    this.initMediaSource();
  }

  private loadChunks(songId: string): void {
    this.songChunkService.findAllBySong(songId).subscribe({
      next: async (chunks: SongChunk[]) => {
        this.chunks = chunks;
        this.currentChunkIndex = 0;

        if (!chunks.length) return;

        if (this.isSourceBufferReady) {
          this.appendChunk(this.currentChunkIndex);
          this.pendingFirstChunk = false;
        } else this.pendingFirstChunk = true;
      },
      error: (err) => console.error(err),
    });
  }

  private async appendChunk(index: number): Promise<void> {
    if (!this.mediaSource || index >= this.chunks.length) return;

    const chunk = this.chunks[index];
    const response = await fetch(chunk.url);
    const arrayBuffer = await response.arrayBuffer();

    if (!this.sourceBuffer) {
      this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
      this.sourceBuffer.mode = 'sequence';
      this.sourceBuffer.addEventListener('updateend', () => {
        this.currentChunkIndex++;
        if (this.currentChunkIndex < this.chunks.length) this.appendChunk(this.currentChunkIndex);
        else this.mediaSource.endOfStream();
      });
    }

    this.sourceBuffer.appendBuffer(arrayBuffer);

    if (index == 0) {
      try {
        await this.audio.play();
      } catch (err) {
        console.warn('Autoplay bloqueado:', err);
      }
    }
  }
}
