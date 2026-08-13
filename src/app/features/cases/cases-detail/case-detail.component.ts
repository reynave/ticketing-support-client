import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-case-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './case-detail.component.html',
  styleUrl: './case-detail.component.css',
})
export class CaseDetailComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
selectedStatusId : number = 0;
statusOptions : any = [];
  caseId = '';
  detail: any = null;
  logs: any[] = [];

  loading = false;
  loadingLogs = false;
  errorMessage = '';
  updatingStatus = false;
  statusErrorMessage = '';
  statusSuccessMessage = '';

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
        this.selectedStatusId = this.detail?.ticketStatusId || 0;
            this.loadStatusOptions();
      },
      error: (error) => {
        this.loading = false;
        this.detail = null;
        this.errorMessage = error?.error?.message || 'Gagal memuat detail case.';
      },
    });
  }

  loadStatusOptions(): void {
    this.apiService.get(`/master/status/cases`).subscribe({
      next: (response) => { 
        this.statusOptions = Array.isArray(response?.data) ? response.data : [];
        // tolong hapus id < 400
       // this.statusOptions = this.statusOptions.filter((option: any) => option.id >= 400);
      },
      error: (error) => {
        this.statusOptions = [];
      }
    });
  }

  submitStatus(): void {
    if (!this.detail || this.updatingStatus) {
      return;
    }

    this.updatingStatus = true;
    this.statusErrorMessage = '';
    this.statusSuccessMessage = '';

    const payload = {
      ticketStatusId: Number(this.selectedStatusId),
    };

    this.apiService.put(`/cases/${this.caseId}/status`, payload).subscribe({
      next: () => {
        this.updatingStatus = false;
        this.statusSuccessMessage = 'Status berhasil diperbarui.';
        this.loadDetail();
        this.loadLogs();
      },
      error: (error) => {
        this.updatingStatus = false;
        this.statusErrorMessage = error?.error?.message || 'Gagal memperbarui status.';
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
