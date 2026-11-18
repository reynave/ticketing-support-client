import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    // bootstrapSession() juga mengecek JWT expired (klaim `exp`) dan mengakhiri sesi,
    // sehingga user diarahkan ke halaman login untuk login ulang.
    this.authService.bootstrapSession();

    setInterval(() => {
      window.location.reload();
    }, 1000 * 60 * 55); // 55 minutes
  }
}
