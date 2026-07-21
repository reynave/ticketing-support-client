import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-case-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './case-detail.component.html',
  styleUrl: './case-detail.component.css',
})
export class CaseDetailComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  caseId = '';
  detail: any = null;
  logs: any[] = [];

  loading = false;
  loadingLogs = false;
  errorMessage = '';

  ngOnInit(): void {
    this.caseId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!this.caseId) {
      void this.router.navigateByUrl('/cases');
      return;
    }

    this.loadDetail();
    this.loadLogs();
  }

  goBack(): void {
    history.back();
  }

  loadDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/cases/${this.caseId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.detail = response?.data || null;
      },
      error: (error) => {
        this.loading = false;
        this.detail = null;
        this.errorMessage = error?.error?.message || 'Gagal memuat detail case.';
      },
    });
  }

  loadLogs(): void {
    this.loadingLogs = true;

    this.apiService.get(`/cases/${this.caseId}/logs`).subscribe({
      next: (response) => {
        this.loadingLogs = false;
        this.logs = Array.isArray(response?.data) ? response.data : [];
      },
      error: () => {
        this.loadingLogs = false;
        this.logs = [];
      },
    });
  }
}
