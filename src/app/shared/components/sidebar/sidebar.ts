import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/user/auth/auth.service';
import { User } from '../../../core/models/user';

@Component({
  selector: 'app-sidebar',
  imports: [LucideAngularModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  @Input() public onClose?: () => void;
  @Output() public closeEvent = new EventEmitter<void>();

  public currentUser = signal<User | null>(null);

  private readonly authService = inject(AuthService);

  public ngOnInit(): void {
    this.authService.user$.subscribe((user) => this.currentUser.set(user));
  }

  public handleClose(): void {
    if (this.onClose) this.onClose();
    this.closeEvent.emit();
  }
}
