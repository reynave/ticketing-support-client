import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

// Row shape returned by GET /client-ticket/cases and GET /client-ticket/change-requests
interface TicketRow {
  id: string;
  projectId: string;
  title: string;
  submitDate: string;
  targetCompletionDate: string;
  ticketStatusId: number;
  ticketStatusName: string;
  assignTo: string;
  assignToName: string;
  projectName: string;
}

interface RecentTicketRow {
  crNoRef: string;
  title: string;
  projectName: string;
  ticketStatusName: string;
  assignToName: string;
  submitDate: string;
}

interface StatCard {
  label: string;
  subtitle: string;
  value: number;
  icon: string;
}

const OPEN_STATUS_THRESHOLD = 900;
const RECENT_TICKETS_LIMIT = 6;
const CHART_MONTHS = 6;

// Maps status name to an accent color used by the recent-tickets list stripe/badge
const STATUS_COLOR_MAP: Record<string, string> = {
  Open: 'blue',
  'In Progress': 'purple',
  Closed: 'green',
  Completed: 'green',
  Pending: 'orange',
  Overdue: 'red',
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  loading = false;
  errorMessage = '';

  statCards: StatCard[] = [
    { label: 'All Cases', subtitle: 'All tickets', value: 0, icon: 'bi-people' },
    { label: 'All Change Requests', subtitle: 'All CR tickets', value: 0, icon: 'bi-chat-dots' },
    { label: 'Case on Progress', subtitle: 'Not yet closed', value: 0, icon: 'bi-arrow-repeat' },
    { label: 'Closed Cases', subtitle: 'Completed tickets', value: 0, icon: 'bi-check2-square' },
  ];

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Cases per Month' },
    },
    scales: {
      x: { stacked: false },
      y: { stacked: false, beginAtZero: true },
    },
  };

  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { label: 'Open', data: [] },
      { label: 'Closed', data: [] },
    ],
  };

  recentTickets: RecentTicketRow[] = [];

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      cases: this.apiService.get('/client-ticket/cases'),
      changeRequests: this.apiService.get('/client-ticket/change-requests'),
    }).subscribe({
      next: ({ cases, changeRequests }) => {
        this.loading = false;
        const caseRows: TicketRow[] = Array.isArray(cases?.data) ? cases.data : [];
        const crRows: TicketRow[] = Array.isArray(changeRequests?.data) ? changeRequests.data : [];

        this.updateStatCards(caseRows, crRows);
        this.updateChart(caseRows);
        this.updateRecentTickets(caseRows, crRows);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Gagal memuat data dashboard.';
      },
    });
  }

  private updateStatCards(caseRows: TicketRow[], crRows: TicketRow[]): void {
    const openCases = caseRows.filter((row) => row.ticketStatusId < OPEN_STATUS_THRESHOLD).length;
    const closedCases = caseRows.length - openCases;

    this.statCards = [
      { label: 'All Cases', subtitle: 'All tickets', value: caseRows.length, icon: 'bi-people' },
      { label: 'All Change Requests', subtitle: 'All CR tickets', value: crRows.length, icon: 'bi-chat-dots' },
      { label: 'Case on Progress', subtitle: 'Not yet closed', value: openCases, icon: 'bi-arrow-repeat' },
      { label: 'Closed Cases', subtitle: 'Completed tickets', value: closedCases, icon: 'bi-check2-square' },
    ];
  }

  private updateChart(caseRows: TicketRow[]): void {
    const now = new Date();
    const months: { key: string; label: string }[] = [];

    for (let i = CHART_MONTHS - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString('default', { month: 'short' }),
      });
    }

    const openCounts = months.map(() => 0);
    const closedCounts = months.map(() => 0);

    caseRows.forEach((row) => {
      const submitDate = new Date(row.submitDate);
      if (Number.isNaN(submitDate.getTime())) {
        return;
      }

      const monthKey = `${submitDate.getFullYear()}-${submitDate.getMonth()}`;
      const monthIndex = months.findIndex((month) => month.key === monthKey);

      if (monthIndex === -1) {
        return;
      }

      if (row.ticketStatusId < OPEN_STATUS_THRESHOLD) {
        openCounts[monthIndex]++;
      } else {
        closedCounts[monthIndex]++;
      }
    });

    this.barChartData = {
      labels: months.map((month) => month.label),
      datasets: [
        { label: 'Open', data: openCounts },
        { label: 'Closed', data: closedCounts },
      ],
    };
  }

  private updateRecentTickets(caseRows: TicketRow[], crRows: TicketRow[]): void {
    this.recentTickets = [...caseRows, ...crRows]
      .sort((a, b) => new Date(b.submitDate).getTime() - new Date(a.submitDate).getTime())
      .slice(0, RECENT_TICKETS_LIMIT)
      .map((row) => ({
        crNoRef: row.id,
        title: row.title,
        projectName: row.projectName,
        ticketStatusName: row.ticketStatusName,
        assignToName: row.assignToName,
        submitDate: row.submitDate,
      }));
  }

  statusColor(status: string): string {
    return STATUS_COLOR_MAP[status] || 'gray';
  }
}
