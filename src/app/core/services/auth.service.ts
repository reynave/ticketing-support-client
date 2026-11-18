import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface LoginForm {
  email: string;
  password: string;
}

const MAX_TIMEOUT_DELAY = 2147483647; // batas maksimal setTimeout (~24.8 hari)

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenKey = '8tt_client_auth_token';
  private readonly userKey = '8tt_client_auth_user';
  private readonly legacyTokenKey = 'tt_client_auth_token';
  private readonly legacyUserKey = 'tt_client_auth_user';

  private readonly currentUserSubject = new BehaviorSubject<any | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get currentUser(): any | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.token && !this.isTokenExpired();
  }

  bootstrapSession(): void {
    this.migrateLegacySession();

    const token = localStorage.getItem(this.tokenKey);
    const storedUser = localStorage.getItem(this.userKey);

    if (!token) {
      return;
    }

    if (this.isTokenExpired(token)) {
      // Token sudah expired: bersihkan sesi, guard akan mengarahkan ke /login?reason=expired.
      this.clearSession();
      return;
    }

    if (storedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser));
      } catch {
        this.currentUserSubject.next(null);
      }
    }

    this.startExpiryWatcher(token);
    this.fetchMe().subscribe();
  }

  login(payload: LoginForm): Observable<any> {
    return this.http.post<any>(`${environment.apiBaseUrl}/client-auth/login`, payload).pipe(
      tap((response) => {
        const token = response?.data?.token;
        const user = response?.data?.user || null;

        if (!token) {
          return;
        }

        localStorage.setItem(this.tokenKey, token);
        this.startExpiryWatcher(token);

        if (user) {
          localStorage.setItem(this.userKey, JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      }),
    );
  }

  fetchMe(): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/client-auth/me`).pipe(
      tap((response) => {
        const user = response?.data || null;

        if (!user) {
          return;
        }

        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
      catchError(() => {
        // Keep existing token/session; do not force logout on one failed bootstrap validation.
        return of(null);
      }),
    );
  }

  logout(redirectToLogin = true): void {
    this.clearSession();

    if (redirectToLogin) {
      void this.router.navigateByUrl('/login');
    }
  }

  /**
   * Akhiri sesi karena token JWT sudah expired, lalu arahkan user login ulang.
   * Dipakai oleh expiry watcher (token habis saat app terbuka) dan auth interceptor (401).
   */
  handleSessionExpired(): void {
    this.clearSession();

    if (this.isLoginPage()) {
      return;
    }

    void this.router.navigate(['/login'], { queryParams: { reason: 'expired' } });
  }

  /**
   * Cek klaim `exp` pada JWT. Token tanpa klaim `exp` dianggap belum expired
   * (validasi akhir tetap dilakukan backend).
   */
  isTokenExpired(token: string | null = this.token): boolean {
    const expiresAt = this.getTokenExpiresAt(token);

    if (expiresAt === null) {
      return false;
    }

    return expiresAt <= Date.now();
  }

  getTokenExpiresAt(token: string | null = this.token): number | null {
    const payload = this.decodeToken(token);
    const exp = payload?.['exp'];

    if (typeof exp !== 'number' || !Number.isFinite(exp)) {
      return null;
    }

    return exp * 1000;
  }

  decodeToken(token: string | null = this.token): Record<string, any> | null {
    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1];

      if (!payload) {
        return null;
      }

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        '=',
      );

      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  private startExpiryWatcher(token: string | null): void {
    this.clearExpiryWatcher();

    const expiresAt = this.getTokenExpiresAt(token);

    if (expiresAt === null) {
      return;
    }

    const remaining = expiresAt - Date.now();

    if (remaining <= 0) {
      this.handleSessionExpired();
      return;
    }

    this.expiryTimer = setTimeout(() => {
      this.expiryTimer = null;
      this.handleSessionExpired();
    }, Math.min(remaining, MAX_TIMEOUT_DELAY));
  }

  private clearExpiryWatcher(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  private clearSession(): void {
    this.clearExpiryWatcher();
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.legacyTokenKey);
    localStorage.removeItem(this.legacyUserKey);
    this.currentUserSubject.next(null);
  }

  private isLoginPage(): boolean {
    return this.router.url.split('?')[0] === '/login';
  }

  private migrateLegacySession(): void {
    const legacyToken = localStorage.getItem(this.legacyTokenKey);
    const legacyUser = localStorage.getItem(this.legacyUserKey);

    if (!localStorage.getItem(this.tokenKey) && legacyToken) {
      localStorage.setItem(this.tokenKey, legacyToken);
    }

    if (!localStorage.getItem(this.userKey) && legacyUser) {
      localStorage.setItem(this.userKey, legacyUser);
    }

    if (legacyToken) {
      localStorage.removeItem(this.legacyTokenKey);
    }

    if (legacyUser) {
      localStorage.removeItem(this.legacyUserKey);
    }
  }
}
