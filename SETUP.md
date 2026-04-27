# Setup Family Finance App

## Langkah 1 — Install Node.js

1. Buka https://nodejs.org
2. Download versi **LTS** (Long Term Support)
3. Install seperti biasa (klik Next terus)
4. Restart komputer setelah install

## Langkah 2 — Install dependencies

Buka **Command Prompt** atau **PowerShell**, lalu jalankan:

```
cd D:\Project\family-finance
npm install
```

Tunggu sampai selesai (~1-2 menit).

## Langkah 3 — Setup Supabase (database gratis)

1. Buka https://supabase.com dan daftar akun gratis
2. Klik **New Project**, isi nama project: `family-finance`
3. Setelah project siap, buka **SQL Editor** di sidebar kiri
4. Copy seluruh isi file `supabase/migrations/001_initial.sql`
5. Paste di SQL Editor, lalu klik **Run**
6. Buka **Settings > API**, copy:
   - **Project URL** 
   - **anon public key**

## Langkah 4 — Konfigurasi environment

1. Di folder `D:\Project\family-finance`, buat file baru bernama `.env.local`
2. Isi dengan:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

Ganti dengan URL dan key dari Supabase lo.

## Langkah 5 — Jalankan aplikasi

```
npm run dev
```

Buka browser, akses: http://localhost:3000

## Langkah 6 — Deploy ke Vercel (online)

1. Buka https://vercel.com dan daftar akun (gratis)
2. Upload folder `family-finance` ke GitHub dulu (atau gunakan Vercel CLI)
3. Di Vercel, klik **New Project** > import dari GitHub
4. Tambahkan environment variables yang sama seperti `.env.local`
5. Klik **Deploy**

Setelah deploy, Vercel akan memberikan URL seperti `family-finance-xxx.vercel.app`
