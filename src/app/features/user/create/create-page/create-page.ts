import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormGroup,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../../../../core/services/user/auth/auth.service';
import { UserService } from '../../../../core/services/user/user.service';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

function matchPasswords(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password != confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-create-page',
  imports: [LucideAngularModule, RouterLink, ReactiveFormsModule],
  templateUrl: './create-page.html',
  styleUrl: './create-page.scss',
})
export class CreatePage {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public error: string | null = null;
  public loading = false;

  public form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchPasswords }
  );

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
    const { name, email, password } = this.form.value as {
      name: string;
      email: string;
      password: string;
    };
    this.userService.create({ name, email, password }).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        this.authService.updateUserData(res.user);
        this.router.navigateByUrl('/home');
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Não foi possível criar sua conta.';
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }
}
