# Agent: Angular 18 Client Portal — Thinktank Ticketing (`ng18-client`)

> 📌 **Dokumen ini adalah sumber kebenaran (single source of truth) untuk frontend Angular client portal (`ng18-client`).**
> Terakhir di-sync dengan kode: **18 November 2026**.
> Jika ada perubahan kode, dokumen ini **wajib** di-update pada sesi yang sama.
> AI agent lain **tidak perlu membaca ulang isi folder `ng18-client`** — baca dokumen ini dulu, lalu buka file spesifik hanya jika perlu detail implementasi.
> ⚠️ `ng18-client` adalah aplikasi **terpisah** dari admin `ng18`. Aturan wajib Angular (lihat §10) tetap berlaku untuk keduanya.

---

## 1. Gambaran Project

- **`ng18-client`** = aplikasi **client portal** (external user / customer view), berdiri sendiri dan **terpisah** dari admin internal **`ng18`**.
- Scope saat ini (lihat juga `AI/todo.md`): login client (tema berbeda dari admin), dashboard/beranda, daftar & detail **Case**, daftar & detail **Change Request (CR)**, riwayat (history) case/CR (tiket closed), **Projects** list/detail (read-only untuk client), **Profile**, dan **Rating** (dipakai dari dalam halaman detail case & CR).
- Auth berbasis **JWT** yang disimpan di `localStorage` (prefix `8tt_`), session wajib bertahan saat refresh/F5.
- Endpoint client memakai prefix `/client-auth/*` dan `/client-portal/*` (bukan endpoint admin).

---

## 2. Tech Stack & Versi

| Kategori | Teknologi |
|---|---|
| Framework | Angular **18.2** (standalone components, tanpa NgModule) |
| Bahasa | TypeScript ~5.5 |
| UI | Bootstrap **5.3.3** (CDN via `@import` di `src/styles.css`), Bootstrap Icons **1.13.1** (CDN di `index.html`), font **Sora** |
| Komponen | `@ng-bootstrap/ng-bootstrap` **17** (modal, rating, datepicker) |
| Chart | `ng2-charts` **6** + `chart.js` **4** |
| Editor | `ngx-editor` **18** (terpasang di `package.json`, belum dipakai di client) |
| Reactive | RxJS **7.8** |
| Router | `withHashLocation()` (hash routing `#/...`) |
| HTTP | `provideHttpClient(withInterceptors([authInterceptor]))` |
| State global | `BehaviorSubject` di dalam **Service** (bukan Signal global) |

---

## 3. Startup & Konfigurasi

| File | Peran |
|---|---|
| `src/main.ts` | `bootstrapApplication(AppComponent, appConfig)` |
| `src/app/app.config.ts` | providers: `provideZoneChangeDetection({ eventCoalescing: true })`, `provideRouter(routes, withHashLocation())`, `provideHttpClient(withInterceptors([authInterceptor]))`, `provideCharts(withDefaultRegisterables())` |
| `src/app/app.component.ts` | template inline `<router-outlet>`, `ngOnInit()` → `authService.bootstrapSession()` |
| `src/index.html` | `<base href="./">`, CDN Bootstrap Icons |

Catatan: app memakai **hash routing** (`#/...`) agar aman dengan `<base href="./">` saat deploy ke subfolder/proxy.

---

## 4. Environment & Build Info

| File | Isi |
|---|---|
| `src/environments/environment.ts` | `apiBaseUrl: 'https://crm.co.id/api-dev'`, `production: true` |
| `src/environments/environment.development.ts` | `apiBaseUrl: 'http://localhost:3000/api'`, `production: false` |
| `src/environments/build-info.ts` | **auto-generated** oleh `npm run prebuild` (`scripts/generate-build-info.js`), format `buildCode: 'YYMMDD.HHmm'`. **Jangan edit manual.** |

Pergantian file production→development diatur di `angular.json` lewat `fileReplacements` saat build/serve configuration `development`.

---

## 5. Struktur Folder `src/app`

```
src/app
├── app.component.ts         # root, bootstrap session
├── app.config.ts            # provider root
├── app.routes.ts            # SEMUA route di sini (eager import, TANPA loadChildren)
├── core/
│   ├── guards/              # auth.guard.ts, login.guard.ts (CanActivateFn)
│   ├── interceptors/        # auth.interceptor.ts (Bearer token)
│   └── services/            # api.service.ts, auth.service.ts
├── layout/
│   └── client-layout.component.*   # layout client (navbar + tabs atas)
└── features/
    ├── auth/login/
    ├── home/
    ├── cases/               # case-list.component + cases-detail/case-detail.component
    ├── cases-history/
    ├── cr/                  # cr.component + cr-detail/cr-detail.component
    ├── cr-history/
    ├── projects/            # project-list.component + project-detail/project-detail.component
    ├── profile/
    └── rate/
```

Konvensi folder: `features/<fitur>/` untuk halaman list, `features/<fitur>/<fitur>-detail/` untuk halaman detail.

---

## 6. Routing (`app.routes.ts`)

| Path | Komponen | Guard |
|---|---|---|
| `login` | `LoginComponent` | `loginGuard` (redirect `/cases` jika sudah login) |
| `''` (layout) | `ClientLayoutComponent` | `authGuard` |
| ├ `home` | `HomeComponent` | (inherit authGuard) |
| ├ `cases` | `CaseListComponent` | |
| ├ `cases-history` | `CasesHistoryComponent` | |
| ├ `cases/:id` | `CaseDetailComponent` | |
| ├ `cr` | `CrComponent` | |
| ├ `cr-history` | `CrHistoryComponent` | |
| ├ `cr/:id` | `CrDetailComponent` | |
| ├ `projects` | `ProjectListComponent` | |
| ├ `projects/:id` | `ProjectDetailComponent` | |
| └ `profile` | `ProfileComponent` | |
| `**` | redirect `home` | |

Guards adalah **functional guard** (`CanActivateFn`):
- `authGuard` → tanpa token redirect ke `/login`.
- `loginGuard` → sudah login redirect ke `/cases`.

Catatan redirect tambahan:
- Child route `''` (`pathMatch: 'full'`) di dalam `ClientLayoutComponent` → `redirectTo: 'home'`.
- Setelah login sukses, `LoginComponent.onSubmit()` → `navigateByUrl('/home')`; `ngOnInit()` juga redirect ke `/home` bila sudah authenticated. Jadi redirect pasca-login adalah **`/home`**, sedangkan `loginGuard` masih mengarah ke **`/cases`** (lihat §14).

⚠️ `RateComponent` di-import di `app.routes.ts` tapi **tidak terdaftar** di route (dead import). Rating dipakai dari dalam halaman detail case **dan** detail CR (`onSubmitRate`), bukan route tersendiri.

---

## 7. Auth & Session (`auth.service.ts`)

| Key localStorage | Nilai |
|---|---|
| `8tt_client_auth_token` | JWT token (wajib prefix `8tt_`) |
| `8tt_client_auth_user` | JSON user |
| `tt_client_auth_token` / `tt_client_auth_user` | **legacy** — dimigrasikan otomatis oleh `migrateLegacySession()` |

Aturan auth (sesuai `AGENT/angular18-rules.md`, lihat §10):
- Token disimpan di **`localStorage`** (bukan `sessionStorage`), prefix `8tt_`.
- `bootstrapSession()` dipanggil di `AppComponent.ngOnInit` — baca token & user, lalu `fetchMe()`.
- `fetchMe()` dibungkus `catchError(() => of(null))` → **JANGAN hapus token** hanya karena validasi awal gagal sekali. Hapus hanya via `logout()` eksplisit / instruksi khusus.
- Sesi login **bertahan saat refresh/F5** selama token masih ada **dan belum expired**.
- Ada migrasi key lama `tt_*` → `8tt_*` (`migrateLegacySession`) agar user tidak force logout.
- `logout(redirectToLogin=true)` menghapus keempat key (delegasi ke `clearSession()`).
- `decodeToken()` decode payload JWT (base64url + padding otomatis) untuk baca klaim mis. `id` / `exp`.
- State user dishare via `currentUserSubject` (`BehaviorSubject`) + `currentUser$` (Observable), dipakai layout via async pipe (`user$`).

### 7.1 Penanganan JWT Expired (wajib login ulang)

Token JWT punya klaim `exp`; begitu expired user **wajib login ulang** dan diarahkan ke `/login?reason=expired`.

| Titik pengecekan | Perilaku |
|---|---|
| `AuthService.isAuthenticated` | `true` hanya jika token **ada** dan **belum expired** (cek klaim `exp`) |
| `isTokenExpired(token?)` / `getTokenExpiresAt(token?)` | Decode `exp` (detik → ms). Token tanpa klaim `exp` dianggap **belum** expired (validasi akhir tetap di backend) |
| `bootstrapSession()` | Token expired → `clearSession()`; guard lalu redirect ke `/login?reason=expired`. Tidak memanggil `me` |
| Expiry watcher (`startExpiryWatcher`) | Dipasang saat bootstrap & setelah `login()` sukses, `setTimeout` sampai `exp`. Saat habis → `handleSessionExpired()` (hapus sesi + redirect `/login?reason=expired`) |
| `authGuard` | Tanpa token → `/login`; token expired → `logout(false)` + `/login?reason=expired` |
| `loginGuard` | Token valid → `/cases`; token expired → `logout(false)` lalu biarkan halaman login tampil |
| `authInterceptor` | Response **401** pada request non-`/client-auth/login` **dan** token expired → `handleSessionExpired()`. 401 lain (mis. salah password) **tidak** menghapus sesi (sesuai §10 poin 16) |
| `LoginComponent` | Baca query param `reason=expired` → tampilkan alert "Your session has expired. Please log in again." |

Helper internal: `clearSession()` (hapus 4 key + reset `currentUserSubject` + batalkan timer) dan `handleSessionExpired()` (clear + navigate, tidak redirect ulang jika sudah di `/login`).

## 8. Service & Pola API

### 8.1 `ApiService` (`core/services/api.service.ts`)

Pusat semua request HTTP. Method:

```ts
apiService.get(path, query?)   // Observable<any> — query object difilter otomatis (undefined/null/'')
apiService.post(path, body)    // Observable<any>
apiService.put(path, body)     // Observable<any>
```

- Base URL diambil dari `environment.apiBaseUrl`.
- **Semua return `Observable<any>`** (generic `<any>`, sesuai aturan).
- `get` menerima query object `Record<string, string|number|boolean|null|undefined>` dan otomatis membuang value kosong (`undefined`/`null`/`''`) saat membangun `HttpParams`.
- Jangan panggil `HttpClient` langsung dari component — lewat `ApiService`. (Pengecualian hanya bila benar-benar perlu, mis. upload progress.)

### 8.2 Bentuk response

- Sukses: `response.data` (bisa object atau array). Contoh akses: `response?.data`, `Array.isArray(response?.data) ? response.data : []`.
- Error: `error?.error?.message` (string pesan) untuk ditampilkan ke user.

### 8.3 Endpoint yang sudah dipakai

| Method | Path |
|---|---|
| POST | `/client-auth/login` |
| GET | `/client-auth/me` |
| GET / PUT | `/client-auth/profile` |
| GET | `/client-portal/cases` (query `keyword`, `ticketStatusId`) |
| POST | `/client-portal/cases` (buat case dari modal di `case-list`) |
| GET | `/client-portal/cases/closed` |
| GET | `/client-portal/cases/:id` |
| PUT | `/client-portal/cases/:id/status` |
| GET | `/client-portal/cases/:id/logs` |
| GET | `/client-portal/change-requests` (query `keyword`, `ticketStatusId`) |
| POST | `/client-portal/change-requests` (buat CR dari modal di `cr`) |
| GET | `/client-portal/change-requests/closed` |
| GET | `/client-portal/change-requests/:id` |
| PUT | `/client-portal/change-requests/:id/status` |
| GET | `/client-portal/change-requests/:id/logs` |
| GET | `/client-portal/projects` (query `status: 1`, `keyword`) |
| GET | `/client-portal/projects/detail/:id` (alias `/:id`) — ⚠️ **tidak lagi** dipanggil saat buat case/CR; modal create memakai `project.users`/`project.modules` dari list `/client-portal/projects` |
| GET | `/client-portal/ticket-categories` (query `presence: 1`) |
| GET | `/client-portal/master/ticket-severities` (query `presence: 1`) |
| GET | `/client-portal/master/status/cases` |
| GET | `/client-portal/rating/master?status=1` ⚠️ query ditulis di dalam string path, bukan lewat argumen `query` `ApiService` |
| POST | `/client-portal/rating/rate` (`{ ticketId, averageRating, ratings[] }`) |
| GET | `/client-portal/client-ticket/cases` (dashboard) |
| GET | `/client-portal/client-ticket/change-requests` (dashboard) |
| GET | `/client-portal/client-ticket/balance/client/:projectId` (cek saldo tiket saat buat case/CR; hanya jika `project.ticketBased == 1`) |
| GET | `/client-portal/ticket-balance/project/:projectId` (saldo tiket di `project-detail` — ⚠️ penamaan beda dari endpoint balance di atas) |

> ⚠️ **Jangan ubah kontrak API backend tanpa instruksi eksplisit.** Jika backend berubah, sinkronkan ke dokumen ini.

---

## 9. Domain & Konsep Inti

- **Case** dan **Change Request (CR)** adalah 2 jenis tiket yang ditampilkan client.
- Status tiket `ticketStatusId >= 900` dianggap **closed** — konstanta `OPEN_STATUS_THRESHOLD = 900` dipakai di `home.component.ts`.
- Warna status di "recent tickets" dipetakan lewat `STATUS_COLOR_MAP` (Open=blue, In Progress=purple, Closed/Completed=green, Pending=orange, Overdue=red).
- **History** (`cases-history`, `cr-history`) menampilkan tiket closed (endpoint `.../closed`).
- **Rating**: client menilai tiket dari halaman detail **case** dan detail **CR** (`onSubmitRate` di masing-masing komponen) — data question dari `/client-portal/rating/master?status=1` (tiap question default `value = 3`), submit ke `/client-portal/rating/rate` dengan `{ ticketId, averageRating, ratings[] }`, lalu `window.location.reload()` setelah sukses.
- **Projects** di client bersifat read-only (list + detail).
- **Profile** memuat & update data user via `/client-auth/profile` (ubah password opsional).

### 9.1 Payload Create Case / CR (`case-list.component.ts` & `cr.component.ts`)

Kedua modal memakai pola yang sama (`submitCreate(form: NgForm)`):

1. `submitBy` diambil dari `AuthService.currentUser.id` → fallback `decodeToken()['id']` (helper `resolveSubmitBy()`). Backend juga mengabaikan body dan memakai token, jadi ini hanya untuk kompatibilitas payload.
2. Project dicari dari list yang sudah dimuat (`this.projects`) — **tidak** ada request `GET /projects/detail/:id` tambahan. `project.users` (project_users) dipakai untuk menentukan PIC: `asManager == 1` dulu, lalu `users[0]`. Bila tidak ada user → tampilkan pesan error modal, tidak POST.
3. Tanggal/waktu dihitung di frontend sebagai **DATETIME MySQL** `YYYY-MM-DD HH:mm:ss` (bukan `HH:mm:ss` saja, bukan ISO):
   - `submitDate` = tanggal form + jam saat submit (`toMySqlDateTime`).
   - `deadlineDateTime` = `submitDate` + SLA severity (`severity.duration` jam; case) → CR tidak punya severity sehingga `addHour = 0`.
   - `targetCompletionDate` = `submitDate` + 50 menit (`targetCompletionOffsetMinutes`).
   - Helper privat: `toMySqlDateTime`, `toDateValue`, `toTimeValue`, `pad2`, `addHours`.
4. Field dipakai backend: `title` (wajib), `description`, `projectId` (wajib), `submitBy`, `submitDate`, `deadlineDateTime`, `targetCompletionDate`, `assignTo`, `ticketStatusId` (`1`), `ticketCategoryId`, `productChildId`, (**case saja**) `ticketSeverityId`. Nilai select kosong dikirim `null` (backend mengubahnya jadi `0`/`''`).
5. ⚠️ Nama durasi SLA di master severity adalah **`duration`** (jam), bukan `addHour` — `addHour` adalah field komponen (`addHour: number = 0`) yang diisi dari `duration`.
6. Sukses → `modalRef.close()` + `successMessage` + reload list; gagal → `error?.error?.message` ke `modalErrorMessage` (modal tetap terbuka).

> ⚠️ Backend memvalidasi `project_contact` pada POST create (`403` bila project bukan milik client) dan me-resolve `assignTo` ke `project_users`; mengirim `assignTo` user di luar project akan di-fallback ke manager/user pertama.

---

## 10. Aturan Wajib Angular (WAJIB DIPATUHI)

Salinan dari `frontEnd/ng18/AGENT/angular18-rules.md` — berlaku juga untuk `ng18-client`:

### DILARANG / Aturan Wajib

1. Dilarang pakai fitur Angular experimental/preview.
2. Dilarang pakai `loadChildren`.
3. Request API wajib generic `any`:
   ```ts
   this.http.get<any>(url, options)
   this.http.post<any>(url, body, options)
   ```
4. Aksi back wajib `history.back()`.
5. Jangan ubah kontrak API backend tanpa instruksi eksplisit.
6. Jangan ubah task owner lain yang sedang `IN_PROGRESS`.
7. Semua service wajib pakai interface `<any>`, untuk HTTP.get, HTTP.post dan lain-lain.

#### Catatan: `<any>` vs Interface/Class
Karena semua request HTTP wajib `<any>`, **interface TypeScript untuk response API ditiadakan** selama kontrak API belum final. Ini disengaja agar tidak ada overhead maintenance ketika shape response berubah.

Yang **boleh** tetap pakai interface/type HANYA model form input (contoh `LoginForm`, `ProfileForm`, `CaseCreateForm`, `FilterParams`) — karena ini kontrak internal komponen, bukan dari API.

Yang **tidak perlu** dibuat: interface untuk response HTTP (`MemberResponse`, `PointData`, dll.) — cukup akses properti langsung dari `response.data`.

```ts
// ✅ form model internal — boleh pakai interface
interface LoginForm {
  email: string;
  password: string;
}

// ✅ HTTP call — wajib <any>
this.http.post<any>(`${this.baseUrl}/auth/login`, payload)
  .subscribe(res => {
    const token = res.data.token; // akses langsung, tanpa cast
  });
```

8. Untuk input form gunakan **Template Driven Form**, bukan Reactive Form.
9. Untuk halaman web, gunakan **[getbootstrap.com](https://getbootstrap.com/)**.
10. **Signal** hanya dipakai untuk state lokal di dalam komponen, jangan untuk variable global / yang diakses banyak komponen / yang banyak merubah tampilan html. Contoh: Tab History.
11. Untuk variable global / yang diakses banyak komponen, gunakan **Service**.
12. Untuk date pakai datepicker dari https://ng-bootstrap.github.io/releases/17.x/#/components/datepicker/api
13. JWT token hasil login wajib disimpan di `localStorage`, bukan `sessionStorage`.
14. Prefix key `localStorage` untuk auth wajib pakai `8tt_`.
15. Session login harus tetap bertahan saat browser refresh / reload / F5 selama token masih ada di `localStorage`.
16. Dilarang menghapus token `localStorage` saat proses bootstrap app / refresh hanya karena request `me` atau validasi awal gagal sekali. Hapus token hanya saat logout eksplisit atau ada instruksi khusus.
17. Jika ada migrasi nama key `localStorage`, wajib sediakan migrasi dari key lama ke key baru agar user tidak force logout.

## 11. Konvensi Kode (diamati dari kode)

- **Standalone components** + `inject()` (bukan constructor DI). Contoh: `private readonly apiService = inject(ApiService);`.
- Prefix selector `app-*` (`app-login`, `app-home`, `app-case-list`, dst).
- **Template Driven Forms**: `FormsModule` + `NgForm`, model berupa object `formModel`. Validasi via `form.invalid`, atribut `required ngModel` di HTML.
- Interface/type **hanya** untuk form model internal (`LoginForm`, `ProfileForm`, `CaseCreateForm`). Response API dibiarkan `any`.
  - ⚠️ **Deviasi yang masih ada di kode:** `home.component.ts` mendefinisikan `TicketRow`, `RecentTicketRow`, dan `StatCard` untuk row dashboard. Ini belum sesuai aturan `<any>` (lihat §14).
- Back navigation selalu `history.back()` (`goBack()`).
- Loading/error state standar: `loading`, `errorMessage` (kadang `successMessage`), pesan dari `error?.error?.message`.
- List memakai `trackByCase(_: number, row: any)` untuk `*ngFor trackBy`.
- Navigasi pakai `void this.router.navigate(['/cases', id])` atau `navigateByUrl(...)`.
- Bootstrap utility classes + icon `bi-*` di template.

---

## 12. Perintah (Commands)

| Perintah | Fungsi |
|---|---|
| `npm start` | `ng serve` (development, port 4200) |
| `npm run build` | `prebuild` (generate build-info) → `ng build` (production) |
| `npm run watch` | `generate-build-info` → `ng build --watch --configuration development` |
| `npm test` | `ng test` (Karma) |
| `npx tsc --noEmit -p tsconfig.app.json` | Cek error TypeScript cepat tanpa build |

---

## 13. Scope & Status Saat Ini

- ✅ Login client (JWT + localStorage `8tt_*` + legacy migration), logout, session persist refresh.
- ✅ Auto-logout saat JWT expired (bootstrap, guard, expiry watcher, 401) → redirect `/login?reason=expired` + alert di halaman login.
- ✅ Layout client (navbar + tabs atas), guard `authGuard`/`loginGuard`.
- ✅ Dashboard/home (stat cards + chart bar via ng2-charts + recent tickets).
- ✅ Case: list (filter/keyword + buat case via modal), detail (ubah status + log + rating), history (closed).
- ✅ Change Request (CR): list (filter/keyword + buat CR via modal), detail (ubah status + log + rating), history (closed).
- ✅ Projects: list + detail (read-only client).
- ✅ Profile: load + update (ubah password opsional).
- ⏳ Belum ada: unit test menyeluruh (tidak ada `.spec.ts`), i18n, server-side pagination, refresh token.

---

## 14. Known Issues & Risiko

| Level | Isu | Lokasi |
|---|---|---|
| 🟡 Sedang | `AppComponent` auto-reload via `setInterval(window.location.reload, 55 menit)` (komentar sudah dikoreksi jadi 55 menit) — pertimbangkan apakah reload paksa masih diperlukan setelah ada auto-logout token expired | `app.component.ts` |
| 🟡 Sedang | `RateComponent` di-import tapi tidak terdaftar di route (dead import) | `app.routes.ts`, `features/rate/` |
| 🟢 Rendah | Panggilan `loadCasesClosed()`/`loadCrClosed()` dikomentari di list case/CR (list closed belum digabung) | `case-list.component.ts`, `cr.component.ts` |
| 🟢 Rendah | Banyak `console.log` debug tersisa | berbagai komponen |
| 🟢 Rendah | Backend URL production masih `crm.co.id/api-dev` (belum final) | `environment.ts` |
| 🟢 Rendah | `ngx-editor` terpasang tapi belum dipakai di client | `package.json` |
| 🟡 Sedang | `home.component.ts` memakai interface untuk response API (`TicketRow`, `RecentTicketRow`, `StatCard`) — belum sesuai aturan `<any>` | `features/home/home.component.ts` |
| 🟢 Rendah | Endpoint saldo tiket tidak konsisten: `.../client-ticket/balance/client/:projectId` vs `.../ticket-balance/project/:projectId` | `case-list`, `cr`, `project-detail` |
| 🟢 Rendah | Redirect pasca-login `/home` (komponen) vs `/cases` (`loginGuard`) — perlu disamakan | `login.component.ts`, `login.guard.ts` |
| 🟢 Rendah | `rating/master?status=1` menulis query di string path, bukan argumen `query` `ApiService` | `case-detail`, `cr-detail`, `rate` |
| 🟢 Rendah | `AuthService` memanggil `HttpClient` langsung (bukan via `ApiService`), padahal `ApiService` didokumentasikan sebagai pusat semua request | `core/services/auth.service.ts` |

---

## 15. Instruksi Eksekusi AI Agent

1. **Baca dokumen ini dulu** sebelum mengubah kode. Ini mencerminkan kondisi kode terkini.
2. Ikuti **aturan wajib** di §10 (no `loadChildren`, HTTP `<any>`, Template-Driven Form, `history.back()`, prefix `8tt_` localStorage, dst).
3. Saat menambah halaman: buat folder `src/app/features/<fitur>/<halaman>/` (file `*.component.ts/html/css` standalone), lalu daftarkan di `app.routes.ts` sebagai children `ClientLayoutComponent` (eager import, **tanpa** `loadChildren`).
4. Semua request API lewat `ApiService`; jangan panggil `HttpClient` langsung dari component.
5. Jangan mengubah kontrak API backend tanpa instruksi eksplisit; jika backend berubah, sinkronkan ke **dokumen ini** juga.
6. Verifikasi setelah edit: jalankan `npx tsc --noEmit -p tsconfig.app.json` (minimal) atau `npm run build` untuk memastikan tidak ada error TS/template.
7. Jika menemukan ketidaksesuaian dokumen vs kode, **perbaiki dokumennya**, bukan hanya kodenya.
8. Jangan commit secret (token, password) ke dokumentasi; jangan edit `build-info.ts` manual.

---

## 16. Referensi Dokumen Terkait

| File | Isi |
|---|---|
| `frontEnd/ng18-client/AI/agent-client.md` | Dokumen ini — panduan arsitektur & konvensi frontend client |
| `frontEnd/ng18-client/AI/todo.md` | Todo list client view |
| `frontEnd/ng18-client/AI/desc.md` | Deskripsi tambahan (bila diisi) |
| `frontEnd/ng18/AGENT/angular18-rules.md` | Aturan wajib pengembangan Angular (sumber §10) |
| `frontEnd/ng18/AGENT/angular-agent.md` | Panduan frontend admin `ng18` (app terpisah, untuk konteks cross-app) |
| `server/AI-AGENT/agent-server.md` | Panduan backend (pasangan dari frontend ini) |
| `frontEnd/ng18-client/README.md` | README bawaan Angular CLI |
