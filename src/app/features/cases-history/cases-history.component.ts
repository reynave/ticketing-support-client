import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

interface CaseCreateForm {
  title: string;
  description: string;
  projectId: string;
  assignTo: string;
  submitDate: string;
  targetCompletionDate: string;
  ticketStatusId: string;
  ticketCategoryId: string;
  severityId: string;
  deadlineDateTime: string;
  productChildId: string;
}

@Component({
  selector: 'app-cases-history',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule],
  templateUrl: './cases-history.component.html',
  styleUrl: './cases-history.component.css',
})
export class CasesHistoryComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(NgbModal);

  private modalRef: any = null;

  rows: any[] = [];
  closedRows: any[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  keyword = '';
  selectedStatus = '';

  saving = false;
  loadingOptions = false;
  modalErrorMessage = '';

  projects: any[] = [];
  ticketSeverities: any[] = [];
  allTicketCategories: any[] = [];
  ticketCategories: any[] = [];
  assignUsers: any[] = [];
  modules: any[] = [];

  goBack() {
    history.back();
  }
  ngOnInit(): void {
    this.loadCasesClosed();
  }

  loadCasesClosed(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: any = {};

    if (this.keyword.trim()) {
      query.keyword = this.keyword.trim();
    }

    if (this.selectedStatus !== '') {
      query.ticketStatusId = this.selectedStatus;
    }

    this.apiService.get('/cases/closed', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.closedRows = Array.isArray(response?.data) ? response.data : [];

        //saya mau gambungakn array this.row dengan this.closedRows
        this.rows = [...this.rows, ...this.closedRows];
      },
      error: (error) => {
        this.loading = false;
        this.closedRows = [];
        this.errorMessage =
          error?.error?.message || 'Gagal memuat daftar cases.';
      },
    });
  }

  resetFilters(): void {
    this.keyword = '';
    this.selectedStatus = '';
    this.loadCasesClosed();
  }

  fnRate(rate: number) {
    if (rate < 2) {
      return 'text-bg-danger';
    } else if (rate == 3) {
      return 'text-bg-warning';
    } else {
      return 'text-bg-success';
    }
  }

  trackByCase(_: number, row: any): string {
    return String(row?.id || row?.crNoRef || _);
  }

  openDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/cases', id]);
  }
}
