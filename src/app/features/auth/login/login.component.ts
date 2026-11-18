import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);

  formModel: LoginForm = {
    email: '',
    password: '',
  };

  loading = false;
  errorMessage = '';
  sessionMessage = '';
  showPassword = false;

  ngOnInit(): void {
    if (this.authService.isAuthenticated) {
      void this.router.navigateByUrl('/home');
      return;
    }

    if (this.route.snapshot.queryParamMap.get('reason') === 'expired') {
      this.sessionMessage = 'Your session has expired. Please log in again.';
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
          void this.router.navigateByUrl('/home');
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error?.error?.message || 'Login failed. Please try again.';
        },
      });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
