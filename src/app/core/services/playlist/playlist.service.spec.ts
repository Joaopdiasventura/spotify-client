import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PlaylistService } from './playlist.service';
import { Playlist, CreatePlaylistDto, UpdatePlaylistDto } from '../../models/playlist';

describe('PlaylistService', () => {
  let service: PlaylistService;
  let httpMock: HttpTestingController;

  const mockPlaylist: Playlist = {
    _id: 'playlist_123',
    name: 'Minhas Favoritas',
    description: 'Minhas músicas favoritas',
    owner: 'user_123',
    songs: ['song_1', 'song_2'],
    coverImage: 'https://example.com/cover.jpg',
    isPublic: true,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:45:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PlaylistService]
    });
    service = TestBed.inject(PlaylistService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get user playlists', () => {
    const mockResponse = {
      data: [mockPlaylist],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };

    service.getUserPlaylists().subscribe(playlists => {
      expect(playlists).toEqual([mockPlaylist]);
    });

    const req = httpMock.expectOne('api/playlists/me');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should create playlist', () => {
    const createDto: CreatePlaylistDto = {
      name: 'Nova Playlist',
      description: 'Descrição da playlist',
      isPublic: true
    };

    service.createPlaylist(createDto).subscribe(playlist => {
      expect(playlist).toEqual(mockPlaylist);
    });

    const req = httpMock.expectOne('api/playlists');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createDto);
    req.flush(mockPlaylist);
  });

  it('should update playlist', () => {
    const updateDto: UpdatePlaylistDto = {
      name: 'Playlist Atualizada',
      description: 'Nova descrição'
    };

    service.updatePlaylist('playlist_123', updateDto).subscribe(playlist => {
      expect(playlist).toEqual(mockPlaylist);
    });

    const req = httpMock.expectOne('api/playlists/playlist_123');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(updateDto);
    req.flush(mockPlaylist);
  });

  it('should delete playlist', () => {
    service.deletePlaylist('playlist_123').subscribe();

    const req = httpMock.expectOne('api/playlists/playlist_123');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
