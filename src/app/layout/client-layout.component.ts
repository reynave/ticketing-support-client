import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { buildInfo } from '../../environments/build-info';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.css',
})
export class ClientLayoutComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  
  user$ = this.authService.currentUser$;
  profile : any = '';
  buildTime: string = buildInfo.buildCode; // auto-generated on each build
  isMenuOpen = false;

  ngOnInit(): void {
    // Initialization logic here
    console.log(this.authService.decodeToken());
    this.profile = this.authService.decodeToken()
  }


  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  logout(): void {
    this.authService.logout(false);
    void this.router.navigateByUrl('/login');
  }
}
