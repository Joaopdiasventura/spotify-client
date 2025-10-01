import { inject, Injectable } from '@angular/core';
import { FindSongDto } from '../../../shared/dto/song/find-song.dto';
import { Observable } from 'rxjs';
import { Song } from '../../models/song';
import { HttpClient, HttpParams } from '@angular/common/http';

declare const API_URL: string;

@Injectable({
  providedIn: 'root',
})
export class SongService {
  private readonly apiUrl = API_URL + '/song';
  private readonly http = inject(HttpClient);

  public findMany(findSongDto: FindSongDto): Observable<Song[]> {
    const params = new HttpParams();
    Object.entries(findSongDto).forEach(([key, value]) => {
      if (value != null && value != undefined) params.append(key, String(value));
    });
    return this.http.get<Song[]>(this.apiUrl, { params });
  }

  public searchSongs(query: string, limit = 20): Observable<Song[]> {
    const params = new HttpParams()
      .set('search', query)
      .set('limit', limit.toString());

    return this.http.get<Song[]>(`${this.apiUrl}/search`, { params });
  }
}
