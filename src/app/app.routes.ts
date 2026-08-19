import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { loginGuard } from './core/guards/login.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { CaseDetailComponent } from './features/cases/cases-detail/case-detail.component';
import { CaseListComponent } from './features/cases/case-list.component';
import { HomeComponent } from './features/home/home.component';
import { ProjectDetailComponent } from './features/projects/project-detail/project-detail.component';
import { ProjectListComponent } from './features/projects/project-list.component';
import { ProfileComponent } from './features/profile/profile.component';
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
				redirectTo: 'home',
			},
			{
				path: 'home',
				component: HomeComponent,
			},
			{
				path: 'cases',
				component: CaseListComponent,
			},
			{
				path: 'cases/:id',
				component: CaseDetailComponent,
			},
			{
				path: 'projects',
				component: ProjectListComponent,
			},
			{
				path: 'projects/:id',
				component: ProjectDetailComponent,
			},
			{
				path: 'profile',
				component: ProfileComponent,
			},

			// Add more routes here as needed

		],
	},
	{
		path: '**',
		redirectTo: 'home',
	},
];
