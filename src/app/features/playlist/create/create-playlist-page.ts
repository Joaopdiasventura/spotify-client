import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, switchMap, debounceTime, distinctUntilChanged, take } from 'rxjs';

import { Song } from '../../../core/models/song';
import { CreatePlaylistDto } from '../../../core/models/playlist';
import { Header } from '../../../shared/components/header/header';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { SongService } from '../../../core/services/song/song.service';
import { PlaylistService } from '../../../core/services/playlist/playlist.service';
import { AuthService } from '../../../core/services/user/auth/auth.service';

@Component({
  selector: 'app-create-playlist-page',
  standalone: true,
  imports: [CommonModule, FormsModule, Header, Sidebar],
  templateUrl: './create-playlist-page.html',
  styleUrl: './create-playlist-page.scss'
})
export class CreatePlaylistPage {
  private readonly songService = inject(SongService);
  private readonly playlistService = inject(PlaylistService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public playlistName = '';
  public playlistDescription = '';
  public isPublic = false;
  public songSearch = '';

  public sidebarOpen = signal(false);
  public isCreating = signal(false);
  public showErrors = false;
  public selectedSongs: Song[] = [];

  public skeletons = Array.from({ length: 5 }, (_, i) => i);

  private searchTerm$ = new BehaviorSubject<string>('');

  public filteredSongs$: Observable<Song[]> = this.searchTerm$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(searchTerm =>
      this.songService.findMany({
        title: searchTerm,
        artist: searchTerm,
        limit: 50,
        orderBy: 'title:asc'
      }).pipe(
        map(songs => songs.filter(song =>
          !this.selectedSongs.find(selected => selected._id === song._id)
        ))
      )
    )
  );

  public constructor() {
    this.searchTerm$.next('');
  }

  public onSongSearchChange(): void {
    this.searchTerm$.next(this.songSearch);
  }

  public toggleSongSelection(song: Song): void {
    const isSelected = this.selectedSongs.find(s => s._id === song._id);

    if (isSelected) {
      this.selectedSongs = this.selectedSongs.filter(s => s._id !== song._id);
    } else {
      this.selectedSongs = [...this.selectedSongs, song];
    }

    this.searchTerm$.next(this.songSearch);
  }

  public isSongSelected(song: Song): boolean {
    return !!this.selectedSongs.find(s => s._id === song._id);
  }

  public removeSelectedSong(index: number): void {
    this.selectedSongs.splice(index, 1);
    this.searchTerm$.next(this.songSearch);
  }

  public formatDuration(duration: number): string {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  public async createPlaylist(): Promise<void> {
    if (!this.playlistName.trim()) {
      this.showErrors = true;
      return;
    }

    this.isCreating.set(true);
    this.showErrors = false;

    try {
      const currentUser = await this.authService.user$.pipe(
        take(1)
      ).toPromise();

      if (!currentUser || !currentUser._id) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const createDto: CreatePlaylistDto = {
        name: this.playlistName.trim(),
        description: this.playlistDescription.trim() || undefined,
        isPublic: this.isPublic,
        songs: this.selectedSongs.map(song => song._id),
        user: currentUser._id
      };

      console.log('Criando playlist com dados:', createDto);

      await this.playlistService.createPlaylist(createDto).toPromise();

      this.router.navigate(['/profile'], {
        state: { refreshPlaylists: true }
      });

    } catch (error) {
      console.error('Erro ao criar playlist:', error);

      if (error instanceof Error && error.message.includes('não autenticado')) {
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        this.router.navigate(['/login']);
      } else {
        alert('Erro ao criar playlist. Tente novamente.');
      }
    } finally {
      this.isCreating.set(false);
    }
  }

  public goBack(): void {
    this.router.navigate(['/profile']);
  }

  public changeSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  public onSearchChange(value: string): void {
    console.log('Search value:', value);
  }
}
