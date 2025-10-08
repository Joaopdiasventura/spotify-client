import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [LucideAngularModule, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {
  @Input() public showSearch = true;
  @Output() public menuClick = new EventEmitter<void>();
  @Output() public searchEvent = new EventEmitter<string>();
  private searchInput$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  public onMenuClick(): void {
    this.menuClick.emit();
  }

  public onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  public ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((v) => this.searchEvent.emit(v));
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
