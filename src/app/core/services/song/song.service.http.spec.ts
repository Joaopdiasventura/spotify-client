import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SongService } from './song.service';

describe('SongService HTTP', () => {
  let service: SongService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(SongService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should GET /song', () => {
    service.findMany({}).subscribe((res) => expect(res).toEqual([]));

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.endsWith('/song'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should GET /song/search for search', () => {
    const query = 'test';
    service.searchSongs(query).subscribe();

    const req = httpMock.expectOne((r) =>
      r.method === 'GET' &&
      r.url.endsWith('/song/search') &&
      r.params.get('search') === query
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
