import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterLink } from '@angular/router';
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
  deadlineDateTime: string;
  productChildId: string;
}

@Component({
  selector: 'app-cr',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, RouterLink],
  templateUrl: './cr.component.html',
  styleUrl: './cr.component.css'
})
export class CrComponent implements OnInit {
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

  formModel: CaseCreateForm = this.defaultForm();

  ngOnInit(): void {
    this.loadCr();
   
    
    this.loadOptions();
  }

  loadCr(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: any = {};

    if (this.keyword.trim()) {
      query.keyword = this.keyword.trim();
    }

    if (this.selectedStatus !== '') {
      query.ticketStatusId = this.selectedStatus;
    }

    this.apiService.get('/client-portal/change-requests', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
       //  this.loadCrClosed();
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage =
          error?.error?.message || 'Failed to load change requests list.';
      },
    });
  }
  loadCrClosed(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: any = {};

    if (this.keyword.trim()) {
      query.keyword = this.keyword.trim();
    }

    if (this.selectedStatus !== '') {
      query.ticketStatusId = this.selectedStatus;
    }

    this.apiService.get('/client-portal/change-requests/closed', query).subscribe({
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
          error?.error?.message || 'Failed to load change requests list.';
      },
    });
  }
  resetFilters(): void {
    this.keyword = '';
    this.selectedStatus = '';
    this.loadCr();
    this.loadCrClosed();
  }

  openCreateModal(content: any): void {
    this.formModel = this.defaultForm();
    this.assignUsers = [];
    this.modules = [];
    this.modalErrorMessage = '';

    this.modalRef = this.modalService.open(content, {
      size: 'lg',
    });

    this.modalRef.result.finally(() => {
      this.modalRef = null;
      this.modalErrorMessage = '';
    });
  }

  closeCreateModal(): void {
    if (this.saving) {
      return;
    }

    this.modalRef?.dismiss();
  }
  ticketBased = false;
  clientBalance: number  =0;
  balanceWarning : string = '';
  onProjectChanged(): void {
    console.log('projectId', this.formModel.projectId);


    // cari project index berdasarkan this.formModel.projectId dari array this.projects
    const projectIndex = this.projects.findIndex(
      (project) => String(project?.id) === String(this.formModel.projectId)
    );  

     if( this.projects[projectIndex].ticketBased == 1) {
 
    this.apiService.get('/client-portal/client-ticket/balance/client/' + this.formModel.projectId).subscribe({
      next: (response) => {
        console.log('project details', response.data);
        this.clientBalance = response.data?.balance || 0;
        this.balanceWarning = response.data?.note || '';

      },
      error: (error) => {
        console.error('Failed to load project details', error);
      },
    });
  } else{
    this.clientBalance = 1000;
    this.balanceWarning = '';
  }

    const selectedProject = this.projects.find(
      (project) => String(project?.id) === String(this.formModel.projectId),
    );
    this.assignUsers = Array.isArray(selectedProject?.users)
      ? selectedProject.users
      : [];
    this.modules = Array.isArray(selectedProject?.modules)
      ? selectedProject.modules
      : [];
    this.formModel.productChildId = '';

    const parentCategoryId = selectedProject?.ticketCategoriesParentId;

    if (!parentCategoryId) {
      this.ticketCategories = [];
      this.formModel.ticketCategoryId = '';
      this.formModel.assignTo = '';
      return;
    }

    const parentCategory = this.allTicketCategories.find(
      (category) => String(category?.id) === String(parentCategoryId),
    );
    const children = Array.isArray(parentCategory?.children)
      ? parentCategory.children
      : [];

    this.ticketCategories = children;
    this.formModel.ticketCategoryId = '';
    this.formModel.assignTo = '';
  }

  addHour: number = 0;

  /** Offset default target completion dihitung dari waktu submit (menit). */
  private readonly targetCompletionOffsetMinutes = 50;

  submitCreate(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    const submitBy = this.resolveSubmitBy();

    if (!submitBy) {
      this.modalErrorMessage = 'User session not found. Please log in again.';
      return;
    }

    // Project list sudah membawa `users` (project_users) dan `modules`,
    // jadi tidak perlu memanggil /client-portal/projects/detail/:id lagi.
    const project = this.projects.find(
      (item: any) => String(item?.id) === String(this.formModel.projectId),
    );

    if (!project) {
      this.modalErrorMessage =
        'Selected project is not available. Please choose another project.';
      return;
    }

    const projectUsers = Array.isArray(project?.users) ? project.users : [];
    const assignee =
      projectUsers.find(
        (user: any) => user?.asManager === true || Number(user?.asManager) === 1,
      ) || projectUsers[0];

    if (!assignee?.id) {
      this.modalErrorMessage =
        'No PIC is assigned to this project. Please contact your administrator.';
      return;
    }

    // Backend menyimpan DATETIME MySQL: 'YYYY-MM-DD HH:mm:ss'.
    const now = new Date();
    const submitDate = this.toMySqlDateTime(now, this.formModel.submitDate);
    const submitDateValue = new Date(submitDate.replace(' ', 'T'));

    // deadlineDateTime = submitDate + durasi SLA (CR tidak punya severity → 0).
    const deadlineDateTime = this.toMySqlDateTime(
      this.addHours(submitDateValue, this.addHour),
    );

    // targetCompletionDate = submitDate + 50 menit (default awal).
    const targetCompletionDate = this.toMySqlDateTime(
      this.addHours(
        submitDateValue,
        this.targetCompletionOffsetMinutes / 60,
      ),
    );

    const payload: any = {
      title: this.formModel.title.trim(),
      description: this.formModel.description.trim(),
      projectId: this.formModel.projectId,
      submitBy,
      submitDate,
      targetCompletionDate,
      deadlineDateTime,
      ticketStatusId: Number(this.formModel.ticketStatusId) || 1,
      ticketCategoryId: this.formModel.ticketCategoryId
        ? Number(this.formModel.ticketCategoryId)
        : null,
      productChildId: this.formModel.productChildId
        ? Number(this.formModel.productChildId)
        : null,
      assignTo: String(assignee.id),
    };

    this.saving = true;
    this.modalErrorMessage = '';

    this.apiService.post('/client-portal/change-requests', payload).subscribe({
      next: () => {
        this.saving = false;
        this.modalRef?.close();
        this.successMessage = 'Change request created successfully.';
        this.loadCr();
      },
      error: (error) => {
        this.saving = false;
        this.modalErrorMessage =
          error?.error?.message || 'Failed to create change request.';
      },
    });
  }

  /** Gabungkan tanggal (opsional 'YYYY-MM-DD') dengan jam dari `value`. */
  private toMySqlDateTime(value: Date, dateOnly?: string): string {
    const pickedDate = String(dateOnly || '').trim() || this.toDateValue(value);

    return `${pickedDate} ${this.toTimeValue(value)}`;
  }

  private toDateValue(value: Date): string {
    return `${value.getFullYear()}-${this.pad2(value.getMonth() + 1)}-${this.pad2(value.getDate())}`;
  }

  private toTimeValue(value: Date): string {
    return `${this.pad2(value.getHours())}:${this.pad2(value.getMinutes())}:${this.pad2(value.getSeconds())}`;
  }

  private pad2(value: number): string {
    return String(value).padStart(2, '0');
  }

  private addHours(value: Date, hours: number): Date {
    return new Date(value.getTime() + hours * 60 * 60 * 1000);
  }

  trackByCase(_: number, row: any): string {
    return String(row?.id || row?.crNoRef || _);
  }

  openDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/cr', id]);
  }

  private loadOptions(): void {
    this.loadingOptions = true;
     

    this.apiService.get('/client-portal/projects', { status: 1 }).subscribe({
      next: (projectResponse) => {
        this.projects = Array.isArray(projectResponse?.data)
          ? projectResponse.data
          : [];

        this.apiService.get('/client-portal/ticket-categories', { presence: 1 }).subscribe({
          next: (categoryResponse) => {
            this.allTicketCategories = Array.isArray(categoryResponse?.data)
              ? categoryResponse.data
              : [];
            this.ticketCategories = [];

            this.apiService
              .get('/client-portal/master/ticket-severities', { presence: 1 })
              .subscribe({
                next: (severityResponse) => {
                  this.ticketSeverities = Array.isArray(severityResponse?.data)
                    ? severityResponse.data
                    : [];
                  this.loadingOptions = false;
                },
                error: () => {
                  this.ticketSeverities = [];
                  this.loadingOptions = false;
                },
              });
          },
          error: () => {
            this.allTicketCategories = [];
            this.ticketCategories = [];
            this.loadingOptions = false;
          },
        });
      },
      error: () => {
        this.projects = [];
        this.allTicketCategories = [];
        this.ticketCategories = [];
        this.ticketSeverities = [];
        this.loadingOptions = false;
      },
    });
  }

  private resolveSubmitBy(): string {
    const currentUser = this.authService.currentUser;

    if (currentUser?.id) {
      return String(currentUser.id);
    }

    const tokenPayload = this.authService.decodeToken();

    if (tokenPayload?.['id']) {
      return String(tokenPayload['id']);
    }

    return '';
  }

  private defaultForm(): CaseCreateForm {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return {
      title: '',
      description: '',
      projectId: '',
      assignTo: '',
      submitDate: date,
      targetCompletionDate: date,
      ticketStatusId: '1',
      ticketCategoryId: '', 
      deadlineDateTime: '',
      productChildId: '',
    };
  }
}
