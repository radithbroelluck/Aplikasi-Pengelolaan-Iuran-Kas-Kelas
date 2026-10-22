KasKelas — aplikasi pengelolaan kas kelas

Cara menjalankan:
1. Ekstrak ZIP ini.
2. Buka folder kaskelas_project di Visual Studio Code.
3. Jalankan index.html menggunakan ekstensi Live Server (disarankan), atau buka index.html langsung di browser.
4. Data disimpan di localStorage browser yang digunakan.

Fitur:
- CRUD anggota kelas (tambah, lihat, edit, hapus dengan perlindungan jika sudah ada transaksi)
- CRUD jenis iuran/tagihan
- Pencatatan pembayaran per anggota dan jenis iuran
- Pencatatan pengeluaran kas
- Pencarian transaksi berdasarkan anggota, jenis, keterangan, tanggal, dan arus kas
- Dashboard pemasukan, pengeluaran, saldo, jumlah anggota
- Rekap pembayaran anggota dan buku kas per periode
- Cetak laporan

Catatan:
- Ini adalah prototipe front-end. Data hanya tersimpan pada browser/perangkat yang sama melalui localStorage, bukan database online.
- Untuk penggunaan multi-admin/perangkat, dibutuhkan backend dan database.
- Penghapusan anggota atau jenis iuran yang sudah terkait transaksi dicegah agar riwayat laporan tetap konsisten.
