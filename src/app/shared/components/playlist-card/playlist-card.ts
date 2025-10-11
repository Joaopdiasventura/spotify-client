import { Component, input, output, inject } from '@angular/core';
import { Playlist } from '../../../core/models/playlist';
import { Router } from '@angular/router';

@Component({
  selector: 'app-playlist-card',
  templateUrl: './playlist-card.html',
  styleUrl: './playlist-card.scss',
})
export class PlaylistCard {
  private router = inject(Router);

  public playlist = input.required<Playlist>();
  public showOwner = input<boolean>(false);

  public play = output<Playlist>();
  public click = output<Playlist>();

  public getSongCount(): number {
    const playlistData = this.playlist();
    return playlistData.songDetails?.length || playlistData.songs?.length || 0;
  }

  public onPlay(event: Event): void {
    event.stopPropagation();
    this.play.emit(this.playlist());
  }

  public onClick(): void {
    this.click.emit(this.playlist());
    const playlistId = this.playlist()._id;
    if (playlistId) {
      this.router.navigate(['/playlists', playlistId]);
    }
  }
}
