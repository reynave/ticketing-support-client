import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { buildInfo } from '../../environments/build-info';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.css',
})
export class ClientLayoutComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  user$ = this.authService.currentUser$;
  profile : any = '';
  buildTime: string = buildInfo.buildCode; // auto-generated on each build
  isMenuOpen = false;
  activeUrl = '';

  ngOnInit(): void {
    // Initialization logic here
    console.log(this.authService.decodeToken());
    this.profile = this.authService.decodeToken()

    this.activeUrl = this.router.url;
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.activeUrl = event.urlAfterRedirects;
      });
  }


  /**
   * Cek menu aktif berdasarkan segmen URL pertama, bukan prefix link.
   * Jadi /cases dan /cases/IS000083 tetap menandai tab "Cases" aktif,
   * sedangkan /cases-history tidak ikut aktif (begitu juga /cr-history).
   */
  isSectionActive(section: string): boolean {
    const path = this.activeUrl.split('?')[0];
    const firstSegment = path.split('/').filter(Boolean)[0] || '';

    return firstSegment.split(';')[0] === section;
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
