import { Component, OnDestroy, inject, OnInit, signal } from '@angular/core';
import { Sidebar } from '../../../../shared/components/sidebar/sidebar';
import { SongService } from '../../../../core/services/song/song.service';
import { AuthService } from '../../../../core/services/user/auth/auth.service';
import { User } from '../../../../core/models/user';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Router, RouterLink } from '@angular/router';
import { Header } from '../../../../shared/components/header/header';

@Component({
  selector: 'app-create-page',
  imports: [Sidebar, Header, ReactiveFormsModule, LucideAngularModule, RouterLink],
  templateUrl: './create-page.html',
  styleUrl: './create-page.scss',
})
export class CreatePage implements OnInit, OnDestroy {
  public sidebarOpen = signal(false);
  public submitting = signal(false);
  public error = signal<string | null>(null);
  public previewThumb = signal<string | null>(null);
  public audioName = signal<string | null>(null);
  public duration = signal<number>(0);
  public previewUrl = signal<string | null>(null);

  private currentUser: User | null = null;

  private readonly authService = inject(AuthService);
  private readonly songService = inject(SongService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  public form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    artist: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.maxLength(500)]],
    lyrics: [''],
    thumbnail: [null, [Validators.required]],
    file: [null, [Validators.required]],
  });

  public get f(): FormGroup['controls'] {
    return this.form.controls;
  }

  public ngOnInit(): void {
    this.authService.user$.subscribe((user) => (this.currentUser = user));
  }

  public ngOnDestroy(): void {
    const url = this.previewUrl();
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        return;
      }
    }
  }

  public changeSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  public onThumbChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.form.patchValue({ thumbnail: file });
    const url = URL.createObjectURL(file);
    this.previewThumb.set(url);
  }

  public async onAudioChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.form.patchValue({ file });
    this.audioName.set(file.name);
    try {
      const dur = await this.computeDuration(file);
      this.duration.set(Math.round(dur));
    } catch {
      this.duration.set(0);
    }
    // preview URL for simple player
    const old = this.previewUrl();
    if (old) {
      try {
        URL.revokeObjectURL(old);
      } catch {
        return;
      }
    }
    this.previewUrl.set(URL.createObjectURL(file));
  }

  private computeDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = URL.createObjectURL(file);
      const onLoaded = (): void => {
        const d = audio.duration;
        URL.revokeObjectURL(audio.src);
        audio.removeEventListener('loadedmetadata', onLoaded);
        if (isFinite(d)) resolve(d);
        else reject(new Error('duration'));
      };
      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('error', () => reject(new Error('audio error')));
    });
  }

  public submit(): void {
    this.error.set(null);
    if (!this.currentUser) {
      this.error.set('Você precisa estar logado para criar uma música.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const fd = new FormData();
    fd.append('title', this.form.value.title);
    fd.append('artist', this.form.value.artist);
    if (this.form.value.description) fd.append('description', this.form.value.description);
    if (this.form.value.lyrics) fd.append('lyrics', this.form.value.lyrics);
    fd.append('user', this.currentUser._id);
    if (this.duration()) fd.append('duration', String(this.duration()));
    fd.append('thumbnail', this.form.value.thumbnail);
    fd.append('song', this.form.value.file);

    this.submitting.set(true);
    this.songService.create(fd).subscribe({
      next: () => this.router.navigateByUrl('/home'),
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Não foi possível criar a música.');
        this.submitting.set(false);
      },
      complete: () => this.submitting.set(false),
    });
  }
}
