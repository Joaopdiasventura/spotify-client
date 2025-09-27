import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Player } from './player';
import { PLATFORM_ID } from '@angular/core';
import { SongChunkService } from '../../../core/services/song-chunk/song-chunk.service';

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
});
