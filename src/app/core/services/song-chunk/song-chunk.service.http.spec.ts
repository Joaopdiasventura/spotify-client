import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SongChunkService } from './song-chunk.service';

describe('SongChunkService HTTP', () => {
  let service: SongChunkService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(SongChunkService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should GET /song-chunk/:id', () => {
    service.findAllBySong('abc').subscribe((res) => expect(res).toEqual([]));

    const req = httpMock.expectOne(
      (r) => r.method === 'GET' && r.url.endsWith('/song-chunk/abc')
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});

