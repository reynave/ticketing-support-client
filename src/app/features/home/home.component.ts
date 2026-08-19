import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

// Sample response shape expected from REST API later, e.g. GET /dashboard/cases-summary
interface DashboardSummaryResponse {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
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
export class HomeComponent {
  // Sample stat cards, to be replaced by data from the REST API, e.g. GET /dashboard/stats
  statCards: StatCard[] = [
    { label: 'All Cases', subtitle: 'All tickets', value: 2300, icon: 'bi-people' },
    { label: 'Waiting To be Reviewed by Client', subtitle: 'Client replies', value: 112, icon: 'bi-chat-dots' },

    { label: 'Case on Progress', subtitle: 'Tickets without reply', value: 1678, icon: 'bi-arrow-repeat' },
    { label: 'Closed Cases', subtitle: 'Staff replies', value: 1678, icon: 'bi-check2-square' },
  ];

  // Sample JSON, to be replaced by data from the REST API
  private readonly dashboardSummarySample: DashboardSummaryResponse = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      { label: 'Open', data: [12, 19, 8, 15, 10, 14] },
      { label: 'In Progress', data: [7, 11, 9, 6, 12, 8] },
      { label: 'Closed', data: [20, 15, 22, 18, 25, 21] },
    ],
  };

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
    labels: this.dashboardSummarySample.labels,
    datasets: this.dashboardSummarySample.datasets.map((dataset) => ({
      label: dataset.label,
      data: dataset.data,
    })),
  };

  // Sample list data, to be replaced by data from the REST API
  recentTickets: RecentTicketRow[] = [
    {
      crNoRef: 'CASE-2026-001',
      title: 'Login page error on mobile',
      projectName: 'Ticketing Portal',
      ticketStatusName: 'Overdue',
      assignToName: 'Waiting',
      submitDate: '2026-08-01',
    },
    {
      crNoRef: 'CASE-2026-002',
      title: 'Export report failed',
      projectName: 'Reporting System',
      ticketStatusName: 'Open',
      assignToName: 'John Doe',
      submitDate: '2026-08-05',
    },
    {
      crNoRef: 'CASE-2026-003',
      title: 'Add new user role',
      projectName: 'Ticketing Portal',
      ticketStatusName: 'Completed',
      assignToName: 'Jane Smith',
      submitDate: '2026-08-10',
    },
    {
      crNoRef: 'CASE-2026-004',
      title: 'Any mechanical keyboard enthusiast question',
      projectName: 'Support',
      ticketStatusName: 'Pending',
      assignToName: 'Waiting',
      submitDate: '2026-08-11',
    },
    {
      crNoRef: 'CASE-2026-005',
      title: 'Understanding color theory: the color wheel',
      projectName: 'Design',
      ticketStatusName: 'Open',
      assignToName: 'John Doe',
      submitDate: '2026-08-12',
    },
    {
      crNoRef: 'CASE-2026-006',
      title: 'How to design a product that can grow',
      projectName: 'Product',
      ticketStatusName: 'Overdue',
      assignToName: 'Jane Smith',
      submitDate: '2026-08-13',
    },
  ];

  statusColor(status: string): string {
    return STATUS_COLOR_MAP[status] || 'gray';
  }
}
