# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status project

Repo ini adalah frontend leaderboard publik (Slice 5 dan 6 di `Leaderboard OMS — PRD & SDD.md`). Bucket R2 dan file JSON-nya sudah siap, jadi pekerjaan di repo ini dimulai dari Astro.

PRD/SDD adalah sumber kebenaran untuk kontrak data, state halaman, dan acceptance criteria. Baca bagian "Kontrak data" dan "Desain frontend (Astro) — spec Slice 5" sebelum mengerjakan fitur. Sisi OMS (Laravel, Slice 1–4 dan 7) ada di repo lain.

## Alur kerja

- Project ini memakai spec-driven development: tulis `spec.md`, `plan.md`, dan `tasks.md` di `specs/<nomor>-<nama>/` sebelum implementasi.
- PRD dan semua isi `specs/` hanya ada di lokal. Keduanya di-gitignore dan tidak boleh masuk GitHub.
- **Setiap fitur yang selesai dan lolos testing wajib langsung di-commit dan di-push ke GitHub** sebelum lanjut ke fitur berikutnya. Jalankan `npm run verify` dulu.

## Perintah

```sh
npm run dev               # dev server Astro (tanpa Pages Function)
astro dev --background    # mode background; kelola dengan astro dev stop|status|logs
npm run pages:dev         # build lalu wrangler pages dev: halaman + Function + R2 lokal
npm run seed [skenario]   # isi R2 lokal dari fixture
npm run build             # build statis ke dist/
npm run verify            # format:check, lint, check, test, dan build sekaligus
npm run lint              # ESLint
npm run format            # Prettier
npm run check             # astro check dan typecheck functions/
npm test                  # Vitest
npx vitest run tests/format.test.ts   # satu file test
npx vitest run -t "nama test"         # satu test
```

Node `>=22.23.4` (lihat `engines` di `package.json`). `npm run seed` hanya menulis ke R2 lokal; jangan menjalankan `wrangler r2` tanpa `--local`, karena itu menyentuh bucket `dss` produksi.

## Arsitektur

Pola _publish snapshot_: OMS menghitung ranking dan meng-upload JSON ke bucket R2 privat `dss`. Browser mengambil data lewat Pages Function, tidak pernah ke VPS OMS.

```
OMS (Laravel) → R2 bucket dss → Pages Function + caches.default → browser
```

- **Halaman:** Astro output statis, Tailwind v4 lewat plugin Vite (`@tailwindcss/vite`, diimpor di `src/styles/global.css`), mobile-first, tanpa scroll horizontal di lebar 360 px.
- **Client:** satu script vanilla TypeScript `src/scripts/leaderboard.ts` untuk fetch, render, dan refresh. Formatter di `src/lib/format.ts`, validasi dan aturan murni di `src/lib/snapshot.ts`. Markup entri ada di `<template>` pada `index.astro` supaya class Tailwind terbaca; isinya wajib lewat `textContent`. Tanpa React (NFR-03).
- **Function:** `functions/api/[leaderboard]/[key].ts` membaca R2 lewat binding `LEADERBOARD_BUCKET` (dideklarasikan di `wrangler.toml`). Folder `functions/` ada di root repo, bukan di `src/`.
- **Dev lokal:** `npm run seed` mengisi bucket R2 lokal dari `fixtures/`. Skenario `terbaru`, `kosong`, `schema-99`, `usang`, dan `hapus` mengganti `terbaru.json`; skenario `arsip` mengisi `index.json` dan dua arsip, supaya pemilih periode muncul. Function menyimpan cache 60 detik, jadi perubahan seed baru terlihat setelah itu atau setelah `pages:dev` diulang.
- **`src/pages/404.astro` wajib ada:** tanpa `404.html`, Cloudflare Pages memperlakukan situs sebagai SPA dan membalas 200 untuk path tak dikenal, termasuk di bawah `/api/`.

## Aturan yang mudah terlewat

- Frontend hanya memformat. `rank` dan `nilai_bersih` dipakai apa adanya dari JSON; jangan menghitung ulang atau mengurutkan ulang. Rank kembar (1, 2, 3, 3, 5) tampil sama.
- Tolak `schema_version` selain `1` dengan pesan "Format data tidak dikenali".
- Format tanggal memakai `Intl`, locale `id-ID`, zona `Asia/Jakarta`.
- `nilai_bersih` berupa string yang sengaja disamarkan OMS, seperti `5.6xx.xxx`. Tampilkan apa adanya dengan awalan `Rp`. Periode ada di `periode.bulan`; `parseSnapshot` menormalkannya ke `periode.key` dan masih menerima bentuk lama.
- Saat fetch gagal, data yang sudah tampil tidak boleh dihapus.
- Refresh tiap 5 menit hanya saat `document.visibilityState === 'visible'`, demi kuota request Function.
- Function adalah batas keamanan bucket: `leaderboard` harus ada di whitelist dan `key` hanya boleh `terbaru`, `index`, atau `YYYY-MM`. Selain itu balas 404, termasuk key berisi `..`. Error R2 dibalas 502 tanpa detail internal.
- History publik dan tetap di halaman `/`: `?periode=YYYY-MM` memilih arsip, tanpa parameter memakai `terbaru`. Gagal berpindah periode tidak boleh meninggalkan pemilih atau URL yang menyebut periode lain dari yang tampil.
- Hanya `rank <= 10` yang tampil, termasuk di arsip; JSON tetap memuat semua entri.
- Tier `End User` dari JSON tampil sebagai "Dropship" lewat `formatTier`.
- Teks antarmuka berbahasa Indonesia.
