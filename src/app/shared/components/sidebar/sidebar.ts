import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  @Input() public onClose?: () => void;
  @Output() public closeEvent = new EventEmitter<void>();

  public handleClose(): void {
    if (this.onClose) this.onClose();
    this.closeEvent.emit();
  }
}
