import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  projectId = '';
  detail: any = null;
  ticketBalances: any[] = [];

  loading = false;
  errorMessage = '';
  loadingBalance = false;

  ngOnInit(): void {
    this.projectId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!this.projectId) {
      void this.router.navigateByUrl('/projects');
      return;
    }

    this.loadDetail();
    this.loadTicketBalance();
  }

  goBack(): void {
    history.back();
  }

  loadDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/project/${this.projectId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.detail = response?.data || null;
      },
      error: (error) => {
        this.loading = false;
        this.detail = null;
        this.errorMessage = error?.error?.message || 'Gagal memuat detail project.';
      },
    });
  }

  loadTicketBalance(): void {
    this.loadingBalance = true;

    this.apiService.get(`/ticket-balance/project/${this.projectId}`).subscribe({
      next: (response) => {
        this.loadingBalance = false;
        this.ticketBalances = Array.isArray(response?.data) ? response.data : [];
      },
      error: () => {
        this.loadingBalance = false;
        this.ticketBalances = [];
      },
    });
  }
}
