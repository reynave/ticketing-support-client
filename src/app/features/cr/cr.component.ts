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
  severityId: string;
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

    this.apiService.get('/change-requests', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
       //  this.loadCrClosed();
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage =
          error?.error?.message || 'Gagal memuat daftar change-requests.';
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

    this.apiService.get('/change-requests/closed', query).subscribe({
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
          error?.error?.message || 'Gagal memuat daftar change-requests.';
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
 
    this.apiService.get('/client-ticket/balance/client/' + this.formModel.projectId).subscribe({
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
  submitCreate(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    const submitBy = this.resolveSubmitBy();

    if (!submitBy) {
      this.modalErrorMessage =
        'Session user tidak ditemukan. Silakan login ulang.';
      return;
    }

    this.saving = true;
    this.modalErrorMessage = '';

    const today = new Date();
    const hhiiss = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;

    // tolong buatkan tanggal dan jam hari ini di tambah 50 menit
    const futureDate = new Date(today.getTime() + 50 * 60 * 1000);
    const futureHhiiss = `${String(futureDate.getHours()).padStart(2, '0')}:${String(futureDate.getMinutes()).padStart(2, '0')}:${String(futureDate.getSeconds()).padStart(2, '0')}`;

    this.apiService.get(`/project/${this.formModel.projectId}`).subscribe({
      next: (response) => {
        this.loading = false;
        const users = response?.data.users || null;

        // cari asManager = 1
        let asManager =
          users?.find((user: any) => user?.asManager === 1) || null;
        console.log('users', users);

        if (!asManager) {
          asManager = users?.[0] || null;
        }
        console.log('asManager', asManager.id);

        const today = new Date();

        // saya mau hhiiss ditambah 3 jam

        this.addHour =
          this.ticketSeverities.find(
            (severity: any) =>
              String(severity?.id) === String(this.formModel.severityId),
          )?.addHour || 0;

        const addHour = this.addHour;
        const threeHoursLater = new Date(
          today.getTime() + addHour * 60 * 60 * 1000,
        );
        const hhiissPlus = threeHoursLater.toTimeString().split(' ')[0];
        const deadlineDateTime =
          `${this.formModel.submitDate}` + ' ' + hhiissPlus;

        const payload: any = {
          title: this.formModel.title.trim(),
          description: this.formModel.description.trim(),
          projectId: this.formModel.projectId,
          submitBy,
          submitDate: this.formModel.submitDate + `T${hhiiss}`,
          targetCompletionDate: futureHhiiss,
          ticketStatusId: Number(this.formModel.ticketStatusId),
          ticketCategoryId: this.formModel.ticketCategoryId
            ? Number(this.formModel.ticketCategoryId)
            : null,
          severityId: this.formModel.severityId
            ? Number(this.formModel.severityId)
            : null,
          deadlineDateTime: deadlineDateTime,
          productChildId: this.formModel.productChildId
            ? Number(this.formModel.productChildId)
            : null,
          assignTo: asManager.id,
        };

        this.apiService.post('/change-requests', payload).subscribe({
          next: () => {
            this.saving = false;
            this.modalRef?.close();
            this.successMessage = 'Case berhasil dibuat.';
            this.loadCr();
          },
          error: (error) => {
            this.saving = false;
            this.modalErrorMessage =
              error?.error?.message || 'Gagal membuat case.';
          },
        });
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || 'Gagal memuat detail project.';
      },
    });
  }

  trackByCase(_: number, row: any): string {
    return String(row?.id || row?.crNoRef || _);
  }

  openDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/change-requests', id]);
  }

  private loadOptions(): void {
    this.loadingOptions = true;
     

    this.apiService.get('/project', { status: 1 }).subscribe({
      next: (projectResponse) => {
        this.projects = Array.isArray(projectResponse?.data)
          ? projectResponse.data
          : [];

        this.apiService.get('/ticket-categories', { presence: 1 }).subscribe({
          next: (categoryResponse) => {
            this.allTicketCategories = Array.isArray(categoryResponse?.data)
              ? categoryResponse.data
              : [];
            this.ticketCategories = [];

            this.apiService
              .get('/master/ticket-severities', { presence: 1 })
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
      severityId: '',
      deadlineDateTime: '',
      productChildId: '',
    };
  }
}
