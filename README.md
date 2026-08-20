# Laporan Keuangan — React + Google Apps Script

Versi ini mengubah aplikasi HTML/Babel sebelumnya menjadi aplikasi React + Vite.

## Perubahan utama

1. **React JS utuh**
   - React 18
   - Vite
   - Komponen laporan tetap mempertahankan UI dan perhitungan dari versi sebelumnya.

2. **URL Apps Script tidak lagi muncul di UI**
   - Frontend membaca:
     `import.meta.env.VITE_APPS_SCRIPT_URL`
   - Tidak ada lagi input URL Apps Script atau penyimpanan URL melalui `localStorage`.

3. **Login**
   - Halaman login muncul sebelum aplikasi laporan.
   - Username/password diverifikasi oleh Google Apps Script terhadap sheet `Users`.
   - Password disimpan sebagai SHA-256 hash, bukan plaintext.
   - Apps Script membuat session token sementara menggunakan `CacheService`.

4. **Data laporan terikat ke user**
   - Setiap laporan menyimpan `owner`.
   - User hanya dapat melihat, membuka, mengubah, dan menghapus laporan miliknya.

## Menjalankan React

```bash
npm install
```

Salin `.env.example` menjadi `.env`:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

Lalu:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

> Catatan: variabel `VITE_*` memang ikut masuk ke bundle browser. Karena itu **URL Apps Script boleh berada di `.env`, tetapi jangan menganggap `.env` React sebagai tempat menyimpan secret**. Spreadsheet ID dan kredensial backend tetap berada di Apps Script.

## Menyiapkan Google Apps Script

1. Buat Google Spreadsheet.
2. Buka Extensions → Apps Script.
3. Ganti kode dengan `apps-script/Code.gs`.
4. Di Apps Script → Project Settings → Script Properties, buat:
   - Property: `SPREADSHEET_ID`
   - Value: ID spreadsheet.
5. Jalankan `setupSheets()` sekali.
6. Pada sheet `Users`, buat data:

| username | passwordHash | name | role | active |
|---|---|---|---|---|
| admin | HASH_SHA256 | Administrator | admin | TRUE |

Untuk mendapatkan hash password, jalankan:

```javascript
logPasswordHash_('password-yang-diinginkan');
```

Lihat hasilnya di Execution log, lalu masukkan hash tersebut ke kolom `passwordHash`.

## Deploy Apps Script

Deploy → New deployment → Web app:

- Execute as: **Me**
- Who has access: **Anyone**

Salin URL Web App `/exec` ke `.env`:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec
```

Setelah mengubah `.env`, restart Vite.

## Struktur project

```text
laporan-keuangan-react/
├─ apps-script/
│  └─ Code.gs
├─ src/
│  ├─ App.jsx
│  ├─ index.css
│  └─ main.jsx
├─ .env.example
├─ .gitignore
├─ index.html
├─ package.json
└─ README.md
```

## Catatan keamanan

Ini sudah lebih baik daripada URL Apps Script yang dapat diubah dari UI, tetapi **Apps Script Web App tetap merupakan endpoint publik**. Login bukan berarti URL menjadi rahasia.

Proteksi utama dilakukan di backend:
- endpoint selain `ping` dan `login` membutuhkan session token;
- session token memiliki masa berlaku;
- operasi laporan memeriksa `owner`;
- spreadsheet ID hanya berada di Script Properties;
- password di sheet menggunakan SHA-256 hash.

Untuk sistem dengan kebutuhan keamanan tinggi, sebaiknya autentikasi dipindahkan ke backend yang memang dirancang untuk session/authentication, bukan Google Apps Script.
