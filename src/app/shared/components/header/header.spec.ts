import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header]
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit menu click event', () => {
    let emitted = false;
    component.menuClick.subscribe(() => emitted = true);

    component.onMenuClick();
    expect(emitted).toBe(true);
  });

  it('should emit search change event', () => {
    let searchValue = '';
    component.searchChange.subscribe((value) => searchValue = value);

    component.searchQuery.set('test');
    component.onSearchChange();
    expect(searchValue).toBe('test');
  });

  it('should clear search', () => {
    component.searchQuery.set('test');
    component.clearSearch();
    expect(component.searchQuery()).toBe('');
  });
});
