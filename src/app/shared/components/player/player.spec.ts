import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Player } from './player';
import { PLATFORM_ID } from '@angular/core';
import { SongChunkService } from '../../../core/services/song-chunk/song-chunk.service';
import { vi } from 'vitest';

// Mock interface para o audio
interface AudioMock {
  pause: () => void;
  play?: () => void;
  paused?: boolean;
  currentTime?: number;
  volume?: number;
  src?: string;
  addEventListener?: (event: string, callback: () => void) => void;
  removeEventListener?: (event: string, callback: () => void) => void;
}

describe('Player (minimal)', () => {
  let component: Player;
  let fixture: ComponentFixture<Player>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Player],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: SongChunkService,
          useValue: {
            findAllBySong: (): {
              subscribe: () => void;
            } => ({ subscribe: (): void => { return; } }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Player);
    component = fixture.componentInstance;
    component.playlist = [
      {
        _id: '1',
        title: 'Track',
        description: 'Desc',
        artist: 'Artist',
        lyrics: '',
        thumbnail: '',
        duration: 120,
      },
    ];
    component.currentIndex = 0;
    component.isPlaying = false;
    fixture.detectChanges();
  });

  it('should create without media APIs (server platform)', () => {
    expect(component).toBeTruthy();
  });

  it('should emit close event when onClose is called', () => {
    const closeSpy = vi.spyOn(component.closeEvent, 'emit');

    component.onClose();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('should stop playback and cleanup when onClose is called', () => {
    // Mock do audio com tipo correto
    const audioMock: AudioMock = {
      pause: vi.fn(),
      src: 'test-src'
    };

    // Usar unknown primeiro para evitar erro de tipo
    component.audio = audioMock as unknown as HTMLAudioElement;
    component.isPlaying = true;

    // Spy na função privada usando approach mais seguro
    const teardownSpy = vi.spyOn(component as unknown as { teardownMediaPipeline: () => void }, 'teardownMediaPipeline');
    const closeSpy = vi.spyOn(component.closeEvent, 'emit');

    component.onClose();

    expect(audioMock.pause).toHaveBeenCalled();
    expect(component.isPlaying).toBe(false);
    expect(teardownSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should have currentSong when playlist and currentIndex are valid', () => {
    expect(component.currentSong).toBeTruthy();
    expect(component.currentSong?.title).toBe('Track');
    expect(component.currentSong?.artist).toBe('Artist');
  });

  it('should return null for currentSong when currentIndex is invalid', () => {
    component.currentIndex = -1;
    expect(component.currentSong).toBeNull();

    component.currentIndex = 10; // Índice fora do range
    expect(component.currentSong).toBeNull();
  });

  it('should format time correctly', () => {
    expect(component.formatTime(0)).toBe('00:00');
    expect(component.formatTime(65)).toBe('01:05');
    expect(component.formatTime(125)).toBe('02:05');
    expect(component.formatTime(3600)).toBe('60:00');
  });
});
