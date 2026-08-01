# Kilat Nusantara — Sistem Pengiriman Paket & Penagihan di Tempat

Sistem yang menjawab dua pertanyaan bisnis inti ekspedisi: **"paket ini terakhir dipegang siapa?"** dan
**"kenapa ongkirnya segini, dan apakah sesuai tarif yang berlaku saat resi dibuat?"**

Dokumen analisis bisnis lengkap (PRD, arsitektur, skema database, API contract, dll) ada di folder
[`docs/`](./docs).

## Anggota Tim

- Mochamed Fadhlan Tuhairi — 1122140146
- Muhammad Habib Alghifari— 1122140152
- Wildan Thoha — 1122140007

## Tech Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS + shadcn/ui · PostgreSQL (Supabase) · Prisma ·
NextAuth.js (Auth.js v5) · Supabase Storage · TanStack Query · Vitest · Serwist (PWA/service worker) ·
Dexie.js (antrian offline IndexedDB)

## Menjalankan Secara Lokal

### 1. Prasyarat

- Node.js 20+ dan npm
- Project Supabase (untuk Postgres + Storage) — atau Postgres lain yang kamu punya

### 2. Install dependencies

```bash
npm install
```

### 3. Siapkan environment variables

```bash
cp .env.example .env
```

Isi `.env` dengan:

- `DATABASE_URL` / `DIRECT_URL` — connection string Postgres kamu (Supabase: Project Settings → Database).
  `DATABASE_URL` pakai connection pooler (port 6543), `DIRECT_URL` pakai direct connection (port 5432, khusus migrasi).
- `NEXTAUTH_SECRET` / `AUTH_SECRET` — random string (`openssl rand -base64 32`).
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — dari Project Settings → API. Kalau dikosongkan, upload bukti foto
  delivery attempt otomatis fallback ke field teks "keterangan bukti" (tidak wajib untuk menjalankan sistem).
- `SUPABASE_STORAGE_BUCKET` — nama bucket Supabase Storage untuk bukti foto (default: `bukti-pengiriman`).

### 4. Migrasi & seed database

```bash
npx prisma migrate dev --name init
npm run db:seed
```

Seed membuat 3 kecamatan (2 normal + 1 zona jauh) dengan agen masing-masing, 1 gudang transit, 3 versi
tarif, dan akun untuk tiap role — semua dengan password `password123`. Kardinalitas sengaja dibuat
realistis (bukan 1 akun per role): 2 Admin Pusat, 4 Petugas Loket tersebar di 3 agen, dan **11 Kurir**
(kurir adalah `User` biasa ber-`role KURIR`, **bukan** tabel `Courier` terpisah — lihat
`docs/03-SKEMA-DATABASE.md`).

| Email | Role |
|---|---|
| owner@kilat.test | OWNER |
| admin@kilat.test, admin2@kilat.test | ADMIN_PUSAT |
| loket@kilat.test … loket4@kilat.test | PETUGAS_LOKET |
| gudang@kilat.test | KEPALA_GUDANG |
| kurir@kilat.test, kurir2@kilat.test … kurir11@kilat.test | KURIR |

### 5. Jalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — kamu akan diarahkan ke halaman login. Akun dengan
role `KURIR` otomatis diarahkan ke `/kurir` (PWA mobile "Mode Malam Jalan"); role lain masuk ke dashboard
desktop "Buku Ledger".

> Service worker (PWA) **dinonaktifkan saat `next dev`** — Serwist butuh webpack, sedangkan `next dev`
> default pakai Turbopack. Untuk menguji install/offline sungguhan, build & jalankan versi produksi (lihat
> bagian "Menguji PWA Kurir" di bawah).

### 6. Jalankan unit test

```bash
npm run test
```

Semua business logic inti (`hitungOngkir`, `hitungSetoranCod`, `resolveLastCustody`, validasi retur 7 hari,
generator nomor resi) ada di `src/lib/business/` sebagai pure function dengan unit test terpisah — tidak
butuh koneksi database untuk dijalankan.

## Menguji PWA Kurir

PWA hanya aktif di build produksi (webpack), bukan `next dev` (lihat catatan di atas):

```bash
npm run build   # sudah otomatis pakai --webpack, service worker ter-generate di public/sw.js
npm run start
```

Lalu buka `http://localhost:3000/kurir` (login sebagai `kurir@kilat.test`):

- **Install**: di Chrome (desktop/Android), akan muncul opsi "Install app" / "Add to Home Screen".
- **Offline**: matikan koneksi (DevTools → Network → Offline), lapor delivery attempt atau setor COD —
  data tersimpan lokal (Dexie/IndexedDB) dengan indikator "menunggu sinkron" di tab Riwayat, bukan error.
- **Sinkron otomatis**: nyalakan lagi koneksi — antrian otomatis terkirim ke server (event `online`),
  tanpa perlu refresh manual.
- Identitas kurir diambil langsung dari sesi login (kurir = `User` ber-role `KURIR`), tidak ada langkah
  pemilihan identitas terpisah. Kalau HP dipakai bergantian antar kurir (device pinjaman kantor), tiap
  item di antrian offline menyimpan `courierId` milik pembuatnya saat itu dan tetap tersinkron atas nama
  orang itu meskipun kurir lain sudah login duluan sebelum sinkron terjadi (lihat `docs/09-PWA-KURIR.md` §3.1).

## Kelola Akun

Sistem ini **admin-provisioned** — tidak ada pendaftaran mandiri. Halaman "Kelola Akun" (`/akun`, akses
Owner/Admin Pusat/Kepala Gudang) dipakai untuk membuat akun baru, menonaktifkan (bukan menghapus), dan
reset password, dengan matriks izin presisi (mis. Admin Pusat **tidak bisa** membuat sesama Admin
Pusat/Owner — mencegah privilege escalation; Kepala Gudang hanya bisa mengelola Kurir di gudangnya
sendiri). Semua pengguna juga bisa mengganti password sendiri lewat "Ganti Password" (sidebar desktop)
atau tab Profil (mobile kurir). Detail matriks & alasan desainnya ada di `docs/11-KELOLA-AKUN-DAN-AUTH.md`.

## Design System

Arah visual ("Buku Ledger" untuk dashboard desktop, "Malam Jalan" untuk PWA kurir), token warna/tipografi,
dan elemen signature "Cap Stempel" (animasi konfirmasi final) didokumentasikan lengkap beserta alasannya
di `docs/10-UIUX-DESIGN-SYSTEM.md`.

## Struktur Proyek

Lihat [`docs/02-ARSITEKTUR.md`](./docs/02-ARSITEKTUR.md) untuk detail struktur folder dan alur request.
Dua aturan desain yang tidak boleh disederhanakan (lihat [`docs/03-SKEMA-DATABASE.md`](./docs/03-SKEMA-DATABASE.md)):

1. **Tarif adalah data bertanggal (versioned)** — `TariffRule` punya `effectiveFrom`/`effectiveTo`, dan
   setiap `Resi` menyimpan `tariffRuleId` sebagai snapshot permanen.
2. **Posisi paket adalah riwayat kejadian (event log)** — `PackageCustodyEvent` bersifat append-only;
   pemegang terakhir paket dihitung dari event dengan timestamp terbesar, bukan kolom status tunggal.
