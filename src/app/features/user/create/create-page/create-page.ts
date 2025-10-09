import { Component, inject, signal } from '@angular/core';
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
import { ModalConfig } from '../../../../shared/interfaces/modal-config';
import { Modal } from '../../../../shared/components/modal/modal';

function matchPasswords(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password != confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-create-page',
  imports: [LucideAngularModule, RouterLink, ReactiveFormsModule, Modal],
  templateUrl: './create-page.html',
  styleUrl: './create-page.scss',
})
export class CreatePage {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public loading = signal(false);

  public modalConfig = signal<ModalConfig | null>(null);

  public form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z\d^A-Za-z0-9!?@#$%&*._-]{8,}$/
          ),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchPasswords }
  );

  public get f(): FormGroup['controls'] {
    return this.form.controls;
  }

  public submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
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
        this.modalConfig.set({
          title: 'Erro',
          content: err?.error?.message ?? 'Não foi possível criar sua conta.',
        });
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }
}
