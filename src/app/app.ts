import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Player } from './shared/components/player/player';
import { PlayerConfig } from './shared/interfaces/config/player';
import { PlayerService } from './shared/services/player/player.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Player],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  public playerConfig = signal<PlayerConfig | null>(null);

  private readonly playerService = inject(PlayerService);

  public ngOnInit(): void {
    this.playerService.player$.subscribe((data) => this.playerConfig.set(data));
  }
}
