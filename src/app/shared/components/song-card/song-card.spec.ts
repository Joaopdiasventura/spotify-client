import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SongCard } from './song-card';

describe('SongCard', () => {
  let component: SongCard;
  let fixture: ComponentFixture<SongCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SongCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SongCard);
    component = fixture.componentInstance;
    component.song = {
      _id: '1',
      title: 'Track',
      description: 'Desc',
      artist: 'Artist',
      lyrics: '',
      thumbnail: '',
      duration: 120,
    };
    component.index = 0;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit index on play click', () => {
    const spy = vi.spyOn(component.playEvent, 'emit');
    component.onPlayClick();
    expect(spy).toHaveBeenCalledWith(0);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should format mm:ss when < 1h', () => {
    component.song.duration = 65; // 01:05
    expect(component.formatedDuration).toBe('01:05');
  });

  it('should format hh:mm:ss when >= 1h', () => {
    component.song.duration = 3661; // 01:01:01
    expect(component.formatedDuration).toBe('01:01:01');
  });
});
