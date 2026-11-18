import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { FormsModule } from '@angular/forms';
import { NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-case-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgbRatingModule ],
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
  ticketSeverities: any[] = [];
 
  ngOnInit(): void {
    this.caseId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!this.caseId) {
      void this.router.navigateByUrl('/cases');
      return;
    }
    this.loadMasterDataQuestions(); 
    this.loadTicketSeverities();
    this.loadDetail();

    this.loadLogs();
  }
  
  goBack(): void {
    history.back();
  }

  loadDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/client-portal/cases/${this.caseId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.detail = response?.data || null;
        this.selectedStatusId = this.detail?.ticketStatusId || 0;
            this.loadStatusOptions();
            
      },
      error: (error) => {
        this.loading = false;
        this.detail = null;
        this.errorMessage = error?.error?.message || 'Failed to load case detail.';
      },
    });
  }

  /**
   * Read-only master data, only used to show the respond time duration
   * (ticket_severity.duration) on the detail page.
   */
  loadTicketSeverities(): void {
    this.apiService
      .get('/client-portal/master/ticket-severities', { presence: 1 })
      .subscribe({
        next: (response) => {
          this.ticketSeverities = Array.isArray(response?.data)
            ? response.data
            : [];
        },
        error: () => {
          this.ticketSeverities = [];
        },
      });
  }

  /**
   * Ticket severity duration from API is stored in hours.
   * Converts it into a readable label, e.g. 120 -> "5 Days", 4 -> "4 Hours",
   * 30 -> "1 Day 6 Hours".
   */
  severityDurationLabel(duration: number | string | null | undefined): string {
    const totalHours = Number(duration);

    if (!Number.isFinite(totalHours) || totalHours <= 0) {
      return '-';
    }

    const days = Math.floor(totalHours / 24);
    const hours = totalHours - days * 24;
    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);
    }

    if (hours > 0) {
      parts.push(`${hours} ${hours === 1 ? 'Hour' : 'Hours'}`);
    }

    return parts.join(' ');
  }

  /**
   * Read-only label for "Ticket Duration Respond Time", e.g. "Medium (5 Days)".
   */
  respondTimeLabel(): string {
    const severityName = this.detail?.ticketSeverityName || '';
    const severity = this.ticketSeverities.find(
      (item) =>
        String(item?.id) === String(this.detail?.ticketSeverityId ?? ''),
    );

    const durationLabel = severity
      ? this.severityDurationLabel(severity.duration)
      : '-';

    if (severityName && durationLabel !== '-') {
      return `${severityName} (${durationLabel})`;
    }

    return severityName || durationLabel || '-';
  }

  /**
   * Read-only label for "Estimation", e.g. "5 Tickets or 10 Hours" / "10 Hours".
   * Returns '-' when the case has no estimation yet.
   */
  estimationLabel(): string {
    const hours = Number(this.detail?.hours || 0);

    if (!Number.isFinite(hours) || hours <= 0) {
      return '-';
    }

    const ticketCost = Number(this.detail?.ticketEstimationCost || 0);

    if (Number(this.detail?.ticketBased || 0) !== 0) {
      return `${ticketCost} Tickets or ${hours} Hours`;
    }

    return `${hours} Hours`;
  }

  loadStatusOptions(): void {
    this.apiService.get(`/client-portal/master/status/cases`).subscribe({
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

  onSubmitRate(){
    const payload = this.ratingQuestions.map((question) => ({
      questionId: question.id,
      rating: question.value || 0,
    }));


  
    const data = {
      rating: payload,
      ticketId: this.caseId
    };
 
    console.log('Submitting rating data:', data);

    let rate = 0;
    let total = 0;
    for(const question of this.ratingQuestions) {
      total += 1;
      rate += question.value || 0;
    }

    const averageRating = total > 0 ? rate / total : 0;

    console.log(payload, this.caseId, averageRating);

    this.apiService.post('/client-portal/rating/rate', {
      ticketId: this.caseId,
      averageRating: averageRating,
      ratings: payload, 
    }).subscribe({
      next: (response) => { 
        console.log('Rating submitted successfully:', response);
        window.location.reload();
      },
      error: (error) => {
        console.error('Failed to submit rating:', error);
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

    this.apiService.put(`/client-portal/cases/${this.caseId}/status`, payload).subscribe({
      next: () => {
        this.updatingStatus = false;
        this.statusSuccessMessage = 'Status updated successfully.';
        this.loadDetail();
        this.loadLogs();
      },
      error: (error) => {
        this.updatingStatus = false;
        this.statusErrorMessage = error?.error?.message || 'Failed to update status.';
      },
    });
  }

  loadLogs(): void {
    this.loadingLogs = true;

    this.apiService.get(`/client-portal/cases/${this.caseId}/logs`).subscribe({
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
ratingQuestions: any[] = [];
   loadMasterDataQuestions(){
    // http://localhost:3000/api/rating/master?status=1
    this.apiService.get('/client-portal/rating/master?status=1').subscribe({
      next: (response) => {
        console.log(response);
        this.ratingQuestions = response.data;
        for (let question of this.ratingQuestions) {
          if (!question.value) {
            question.value = 3;
          }
        }
        // Handle the response here
      },
      error: (error) => {
        // Handle the error here
      }
    });
  }
}
