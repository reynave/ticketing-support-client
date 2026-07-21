import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface LoginForm {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  formModel: LoginForm = {
    email: '',
    password: '',
  };

  loading = false;
  errorMessage = '';
  showPassword = false;

  ngOnInit(): void {
    if (this.authService.isAuthenticated) {
      void this.router.navigateByUrl('/cases');
    }
  }

  onSubmit(form: NgForm): void {
    if (form.invalid || this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService
      .login({
        email: this.formModel.email,
        password: this.formModel.password,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          void this.router.navigateByUrl('/cases');
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error?.error?.message || 'Login gagal. Silakan coba lagi.';
        },
      });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
