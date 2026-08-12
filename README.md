# CS Test Platform — Test Administrasi Customer Service (Shopee & TikTok Shop)

Website untuk seleksi administrasi calon customer service e-commerce, mencakup:

1. **Form registrasi kandidat** (`index.html`)
2. **Tes pengetahuan** — pilihan ganda + esai, dengan timer countdown yang **otomatis submit** saat waktu habis (`test.html`)
3. **Simulasi menangani komplain** — AI (via Groq) berperan sebagai pelanggan Shopee/TikTok Shop yang komplain, kandidat membalas sebagai CS. Percakapan disimpan apa adanya (tanpa skor otomatis) untuk dibaca HR (`complaint.html`)
4. **Panel admin** — HR login lalu melihat semua kandidat, skor tes pengetahuan, jawaban esai, dan transkrip simulasi komplain (`admin.html`)

## Stack

- **Frontend**: HTML/CSS/JS statis (tanpa build step), konsisten dengan pola `packingsistem` kamu.
- **Backend**: Vercel Serverless Functions (folder `/api`, Node.js, CommonJS).
- **Database**: Supabase (Postgres).
- **AI Router**: Groq (OpenAI-compatible endpoint) dengan **auto-failover 6 API key** — kalau key-1 gagal/limit, otomatis coba key-2, dst sampai key-6.

## Setup

### 1. Supabase

1. Buat project baru di Supabase (atau pakai yang sudah ada).
2. Buka **SQL Editor**, jalankan seluruh isi `supabase-schema.sql`.
3. Catat **Project URL** dan **Service Role Key** (Settings → API) — JANGAN pakai anon key untuk ini karena semua akses lewat server.

### 2. Environment Variables

Salin `.env.example`, isi semua value-nya. Kalau deploy ke Vercel, masukkan lewat:
**Project → Settings → Environment Variables**.

Penting:
- `ADMIN_PASSWORD` — password yang diketik HR di halaman login.
- `ADMIN_API_TOKEN` — string acak panjang (generate sendiri, mis. `openssl rand -hex 32`), dipakai sebagai token sesi setelah login.
- `GROQ_API_KEY_1` s/d `GROQ_API_KEY_6` — isi minimal 1, idealnya semua 6 untuk failover maksimal.

**PENTING SOAL KEAMANAN**: jangan pernah taruh API key asli (Groq/Supabase) di kode, di file yang di-commit ke Git, atau di chat manapun. Selalu lewat Environment Variables. Kalau ada key yang pernah ter-expose (misal pernah dipaste di chat/tempat publik), sebaiknya **regenerate/revoke** key itu di dashboard Groq dan pakai yang baru.

### 3. Deploy ke Vercel

```bash
npm install -g vercel   # kalau belum ada
cd cs-test-platform
vercel                  # ikuti instruksi, hubungkan ke akun kamu
vercel --prod
```

Vercel otomatis mendeteksi:
- Semua file di `/public` sebagai static hosting.
- Semua file `.js` di `/api` (kecuali yang di folder `_lib`, diawali underscore) sebagai serverless function endpoint.

### 4. Akses

- Kandidat: `https://domain-kamu.vercel.app/`
- Admin/HR: `https://domain-kamu.vercel.app/admin-login.html`

## Kustomisasi

- **Soal tes**: edit `public/js/questions.js` (teks soal & pilihan) DAN `api/_lib/questionBank.js` (kunci jawaban, `question_id` harus sama persis di kedua file).
- **Durasi timer**: env var `KNOWLEDGE_TIME_LIMIT_MINUTES` & `COMPLAINT_TIME_LIMIT_MINUTES` (default 20 & 10 menit).
- **Jumlah putaran simulasi komplain**: env var `MAX_COMPLAINT_EXCHANGES` (default 5 balasan CS per sesi).
- **Skenario/persona AI complaint**: edit array `TOPICS` dan `PERSONAS` di `api/generate-complaint.js`.

## Catatan Keamanan

- Kunci jawaban pilihan ganda **tidak pernah** dikirim ke browser kandidat — hanya ada di server (`api/_lib/questionBank.js`), sehingga tidak bisa diintip lewat DevTools.
- Akses tabel Supabase hanya lewat Service Role Key di server; RLS aktif tanpa policy publik sehingga anon key browser tidak bisa akses langsung.
- Panel admin dilindungi token sederhana (`ADMIN_API_TOKEN`) — cukup untuk tim kecil/internal. Kalau butuh multi-admin dengan akun terpisah, perlu ditambah sistem auth yang lebih lengkap (mis. Supabase Auth).
