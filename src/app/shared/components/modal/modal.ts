import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ModalConfig } from '../../interfaces/config/modal';
@Component({
  selector: 'app-modal',
  imports: [LucideAngularModule],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  @Input({ required: true }) public config!: ModalConfig;
  @Output() public close = new EventEmitter<void>();

  public isArray(msg: unknown): msg is string[] {
    return Array.isArray(msg);
  }

  @HostListener('document:keydown.enter')
  public onOverlayClick(): void {
    this.close.emit();
  }
}
