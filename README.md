# Kilat Nusantara — Sistem Pengiriman Paket & Penagihan di Tempat

Sistem yang menjawab dua pertanyaan bisnis inti ekspedisi: **"paket ini terakhir dipegang siapa?"** dan
**"kenapa ongkirnya segini, dan apakah sesuai tarif yang berlaku saat resi dibuat?"**

Dokumen analisis bisnis lengkap (PRD, arsitektur, skema database, API contract, dll) ada di folder
[`docs/`](./docs).

## Anggota Tim

- [Nama Anggota 1] — [role/pembagian tugas]
- [Nama Anggota 2] — [role/pembagian tugas]
- [Nama Anggota 3] — [role/pembagian tugas]
- [Nama Anggota 4] — [role/pembagian tugas]

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

Seed membuat data dasar (kecamatan, agen, gudang, kurir, 3 versi tarif) dan 5 akun (satu per role),
semua dengan password `password123`:

| Email | Role |
|---|---|
| owner@kilat.test | OWNER |
| admin@kilat.test | ADMIN_PUSAT |
| loket@kilat.test | PETUGAS_LOKET |
| gudang@kilat.test | KEPALA_GUDANG |
| kurir@kilat.test | KURIR |

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
- Kurir pertama kali perlu memilih "Saya adalah [nama kurir]" sekali di perangkat — skema database
  memang tidak menautkan akun login ke entitas `Courier` secara langsung (lihat alasan desain skema),
  jadi ini dipilih di client dan disimpan di localStorage.

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
