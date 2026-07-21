# TODO NG18-CLIENT (Client View)

## Scope Utama
- [x] Implementasi login untuk client view (desain berbeda dari ng18 internal/admin).
- [x] Batasi akses halaman hanya untuk CASES setelah user login.
- [x] Setelah login sukses, redirect langsung ke halaman CASES.
- [x] Tata letak menu/tabs di bagian atas halaman.

## UI/UX
- [x] Gunakan Bootstrap 5.3 untuk struktur komponen dan utility classes.
- [x] Gunakan HTML + CSS custom untuk tema warna client (berbeda dari admin).
- [x] Pastikan tampilan responsif desktop dan mobile.

## Routing dan Guard
- [x] Buat route publik untuk login.
- [x] Buat route privat untuk cases.
- [x] Tambahkan auth guard agar route selain login/cases tidak bisa diakses tanpa token.
- [x] Pastikan default route mengarah ke login (jika belum login) atau ke cases (jika sudah login).

## Auth dan Session
- [x] Integrasi endpoint login menggunakan REST API existing.
- [x] Simpan JWT token ke localStorage dengan prefix key `8tt_`.
- [x] Pertahankan session saat refresh/F5 jika token masih valid tersedia.
- [x] Jangan hapus token saat bootstrap hanya karena validasi awal gagal sekali.
- [x] Logout harus menghapus token secara eksplisit.

## Form dan Data
- [x] Form login wajib pakai Template Driven Form.
- [x] Semua request HTTP wajib pakai generic `<any>` sesuai rules.
- [x] Jangan ubah kontrak API backend.

## Halaman CASES
- [x] Tampilkan daftar cases dari REST API existing.
- [x] Sediakan loading state, empty state, dan error state yang jelas.
- [x] Buat top tabs/menu sederhana untuk navigasi area client (tetap fokus ke CASES).

## Quality Check
- [ ] Verifikasi flow end-to-end: login -> redirect -> cases -> refresh tetap login.
- [ ] Verifikasi unauthorized user tidak bisa akses halaman selain yang diizinkan.
- [x] Cek konsistensi aturan di `ng18/AGENT/angular18-rules.md` sebelum finalisasi.
