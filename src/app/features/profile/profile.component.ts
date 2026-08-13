import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface ProfileForm {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  mobile: string;
  birthday: string;
  division: string;
  position: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  formModel: ProfileForm = this.defaultForm();

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get('/client-auth/profile').subscribe({
      next: (response) => {
        this.loading = false;
        const data = response?.data || {};
        this.formModel = {
          ...this.defaultForm(),
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          mobile: data.mobile || '',
          birthday: data.birthday ? String(data.birthday).slice(0, 10) : '',
          division: data.division || '',
          position: data.position || '',
        };
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Gagal memuat profile.';
      },
    });
  }

  onSubmit(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    if (this.formModel.password && this.formModel.password !== this.formModel.confirmPassword) {
      this.errorMessage = 'Konfirmasi password tidak sama.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: any = {
      email: this.formModel.email.trim(),
      firstName: this.formModel.firstName.trim(),
      lastName: this.formModel.lastName.trim(),
      phone: this.formModel.phone.trim(),
      mobile: this.formModel.mobile.trim(),
      birthday: this.formModel.birthday,
      division: this.formModel.division.trim(),
      position: this.formModel.position.trim(),
    };

    if (this.formModel.password) {
      payload.password = this.formModel.password;
    }

    this.apiService.put('/client-auth/profile', payload).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Profile berhasil diperbarui.';
        this.formModel.password = '';
        this.formModel.confirmPassword = '';
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Gagal memperbarui profile.';
      },
    });
  }

  private defaultForm(): ProfileForm {
    return {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      mobile: '',
      birthday: '',
      division: '',
      position: '',
      password: '',
      confirmPassword: '',
    };
  }
}
