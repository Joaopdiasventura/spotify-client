import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/user/auth/auth.service';
import { UserService } from '../../../../core/services/user/user.service';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-login-page',
  imports: [LucideAngularModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public error: string | null = null;
  public loading = false;

  public form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  public get f(): FormGroup['controls'] {
    return this.form.controls;
  }

  public submit(): void {
    this.error = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.userService.login(this.form.value).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        this.authService.updateUserData(res.user);
        this.router.navigateByUrl('/home');
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Não foi possível entrar. Tente novamente.';
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }
}
