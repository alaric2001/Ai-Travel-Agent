Berikut adalah **Product Backlog** beserta **User Story** dan **Peran (Role)** yang dirancang berdasarkan arsitektur "Sistem AI Agent Otonom untuk Travel, Perdin, & Manajemen BBM" pada dokumen sumber.

### TAHAP 1: Database & Role-Based Access Control (RBAC)

**1. Backlog: Manajemen Database Karyawan & Pagu (HRIS & ERP)**
*   **User Story (Admin HR):** Sebagai Admin HR, saya ingin mengatur data Karyawan (Nama, Jabatan, Golongan) dan mengaitkannya dengan Matriks Pagu (batas harga maksimal tiket pesawat dan hotel per malam), sehingga sistem dapat membatasi pilihan pemesanan secara otomatis.

**2. Backlog: Manajemen Database Whitelist Policy**
*   **User Story (Admin Finance):** Sebagai Admin Finance, saya ingin memasukkan daftar item pengeluaran yang diizinkan (makanan, tol) dan dilarang (rokok, minuman beralkohol), sehingga AI Audit dapat secara otomatis menolak item belanja yang tidak sesuai kebijakan.

**3. Backlog: Manajemen Database Aset Kendaraan**
*   **User Story (Admin Operasional):** Sebagai Admin Operasional, saya ingin mendata seluruh kendaraan kantor beserta rata-rata efisiensi konsumsi BBM-nya dalam satuan KM/Liter (misalnya Toyota Avanza = 11 KM/Liter), agar sistem dapat menghitung jatah volume BBM dengan sangat presisi.

---

### TAHAP 2: Modul 1 - Booking Agent (Travel & Hotel)

**4. Backlog: Input Pencarian NLP (Natural Language Processing)**
*   **User Story (Karyawan):** Sebagai Karyawan, saya ingin bisa mengetikkan permintaan perjalanan dinas menggunakan bahasa sehari-hari yang kasual, sehingga AI dapat menerjemahkannya ke dalam parameter terstruktur (seperti bandara, tanggal absolut, harga) tanpa saya harus mengisi form yang rumit.

**5. Backlog: Filter Pencarian Sesuai Pagu Karyawan**
*   **User Story (Karyawan):** Sebagai Karyawan, saya ingin melihat hasil pencarian tiket pesawat dan hotel dari OTA (seperti Fliggy) yang **hanya menampilkan opsi di bawah batas maksimal (pagu) golongan saya**, sehingga saya tidak salah memesan fasilitas di luar jatah.

**6. Backlog: Sistem Dispensasi Atasan (Human-in-the-loop)**
*   **User Story (Atasan / Direksi):** Sebagai Atasan, saya ingin menerima notifikasi jika karyawan tidak menemukan opsi harga yang sesuai pagu akibat *high season*, agar saya dapat memberikan persetujuan manual atau dispensasi secara cepat.

**7. Backlog: Eksekusi Pembayaran Virtual**
*   **User Story (Karyawan):** Sebagai Karyawan, saya ingin sistem secara otomatis membuat *Virtual Credit Card (VCC)* sebesar nilai tiket setelah pemesanan disetujui, sehingga saya tidak perlu mengeluarkan dana talangan pribadi terlebih dahulu.

---

### TAHAP 3: Modul 2 - Audit Agent (Expense & Reimbursement)

**8. Backlog: OCR Struk / Nota Visual AI**
*   **User Story (Karyawan):** Sebagai Karyawan, saya ingin mengunggah foto nota atau struk belanja dari HP saya ke dalam aplikasi, agar saya bisa cepat melakukan klaim (*reimbursement*) tanpa menyerahkan fisik nota ke kantor.

**9. Backlog: Ekstraksi Item & Nominal Otomatis**
*   **User Story (Admin Finance):** Sebagai Admin Finance, saya ingin sistem mengekstrak detail nama merchant, tanggal, nominal setiap *line-item* belanja, dan total akhir dari struk secara otomatis, sehingga saya terbebas dari proses input manual.

**10. Backlog: Audit Whitelist & Perhitungan Ulang Nominal**
*   **User Story (Admin Finance):** Sebagai Admin Finance, saya ingin AI mengecek satu per satu barang yang dibeli di dalam struk dan **menghitung ulang total yang disetujui** (Nominal Disetujui = Total Nota - Item Ditolak) jika ditemukan barang yang melanggar aturan, untuk menjamin keamanan dari praktik kecurangan uang makan.

---

### TAHAP 4: Modul 3 - Fuel Agent (Manajemen BBM)

**11. Backlog: Input Rute (Pin Drop) & Perhitungan Jarak Aktual**
*   **User Story (Karyawan):** Sebagai Karyawan, saya ingin meletakkan pin untuk lokasi keberangkatan, titik perhentian, dan lokasi tujuan di dalam peta (Google Maps), sehingga sistem dapat mengkalkulasi jarak tempuh riil saya (dalam kilometer).

**12. Backlog: Top-up Otomatis Fleet Card (Kendaraan Kantor)**
*   **User Story (Karyawan):** Sebagai Karyawan yang menggunakan kendaraan kantor, saya ingin kartu kuota bensin saya (*Fleet Card*) terisi saldo secara instan sesuai hitungan otomatis (Jarak Aktual dibagi Efisiensi Mobil) sesaat sebelum saya dinas, agar perjalanan operasional lebih lancar.

**13. Backlog: Limit Klaim (Kendaraan Pribadi)**
*   **User Story (Karyawan):** Sebagai Karyawan yang memakai kendaraan pribadi untuk dinas, saya ingin sistem **mengunci nilai klaim maksimal bensin di awal perjalanan**, sehingga pada saat saya pulang dan mengunggah struk SPBU, batas uang ganti yang saya terima sudah final dan disepakati otomatis.