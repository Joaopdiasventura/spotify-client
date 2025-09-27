import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SongChunkService } from './song-chunk.service';

describe('SongChunkService', () => {
  let service: SongChunkService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(SongChunkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
