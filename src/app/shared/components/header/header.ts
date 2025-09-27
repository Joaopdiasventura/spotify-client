import { Component, EventEmitter, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-header',
  imports: [LucideAngularModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Output() public menuClick = new EventEmitter<void>();

  public onMenuClick(): void {
    this.menuClick.emit();
  }
}
