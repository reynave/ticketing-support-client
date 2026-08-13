import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.css',
})
export class ProjectListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  rows: any[] = [];
  loading = false;
  errorMessage = '';

  keyword = '';
  selectedStatus = '1';

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: any = {};

    if (this.selectedStatus !== '') {
      query.status = this.selectedStatus;
    }

    if (this.keyword.trim()) {
      query.keyword = this.keyword.trim();
    }

    this.apiService.get('/project', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Gagal memuat daftar project.';
      },
    });
  }

  resetFilters(): void {
    this.keyword = '';
    this.selectedStatus = '1';
    this.loadProjects();
  }

  trackByProject(_: number, row: any): string {
    return String(row?.id || _);
  }

  openDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/projects', id]);
  }
}
