import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { loginGuard } from './core/guards/login.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { CaseDetailComponent } from './features/cases/cases-detail/case-detail.component';
import { CaseListComponent } from './features/cases/case-list.component';
import { ClientLayoutComponent } from './layout/client-layout.component';

export const routes: Routes = [
	{
		path: 'login',
		component: LoginComponent,
		canActivate: [loginGuard],
	},
	{
		path: '',
		component: ClientLayoutComponent,
		canActivate: [authGuard],
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'cases',
			},
			{
				path: 'cases',
				component: CaseListComponent,
			},
			{
				path: 'cases/:id',
				component: CaseDetailComponent,
			},
		],
	},
	{
		path: '**',
		redirectTo: 'cases',
	},
];
