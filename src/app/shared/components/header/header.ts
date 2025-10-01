import { Component, EventEmitter, Output, signal, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  imports: [LucideAngularModule, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Output() public menuClick = new EventEmitter<void>();
  public searchQuery = signal<string>('');
  public searchChange = output<string>();

  public onMenuClick(): void {
    this.menuClick.emit();
  }

  public onSearchChange(): void {
    this.searchChange.emit(this.searchQuery());
  }

  public clearSearch(): void {
    this.searchQuery.set('');
    this.searchChange.emit('');
  }
}
