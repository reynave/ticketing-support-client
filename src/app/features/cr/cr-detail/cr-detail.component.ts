import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { FormsModule } from '@angular/forms';
import { NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-cr-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgbRatingModule],
  templateUrl: './cr-detail.component.html',
  styleUrl: './cr-detail.component.css'
})
export class CrDetailComponent implements OnInit {
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
    this.loadMasterDataQuestions(); 
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

    this.apiService.post('/rating/rate', {
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
ratingQuestions: any[] = [];
   loadMasterDataQuestions(){
    // http://localhost:3000/api/rating/master?status=1
    this.apiService.get('/rating/master?status=1').subscribe({
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
