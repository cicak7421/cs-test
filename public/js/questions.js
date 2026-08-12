// public/js/questions.js
// Bank soal test administrasi CS e-commerce (Shopee & TikTok Shop) — VERSI PUBLIK.
// PENTING: file ini dimuat di browser kandidat, jadi TIDAK berisi kunci jawaban.
// Kunci jawaban (correctIndex) hanya ada di server: api/_lib/questionBank.js
// Kalau mengubah/menambah soal di sini, pastikan juga update api/_lib/questionBank.js
// dengan question id yang SAMA persis (dan urutan correctIndex yang sesuai).

const TEST_CONFIG = {
  knowledgeTimeLimitMinutes: 15,
  complaintTimeLimitMinutes: 10,
  maxComplaintExchanges: 5, // maksimal jumlah balasan AI customer per simulasi
  minComplaintExchanges: 3, // minimal jumlah balasan CS sebelum boleh "Selesaikan Test"
};

const QUESTION_BANK = [
  // ---------- MULTIPLE CHOICE ----------
  {
    id: "mc-01",
    type: "multiple_choice",
    text: "Seorang pembeli komplain barang belum sampai padahal status resi sudah 'Terkirim'. Langkah pertama yang paling tepat adalah?",
    options: [
      "Langsung menyalahkan kurir dan menutup chat",
      "Minta pembeli cek ulang di rumah/tetangga/satpam, lalu bantu lacak resi secara detail",
      "Menyuruh pembeli mengajukan refund tanpa penjelasan",
      "Mengabaikan chat sampai pembeli komplain lagi",
    ],
  },
  {
    id: "mc-02",
    type: "multiple_choice",
    text: "Dalam kebijakan umum marketplace (Shopee/TikTok Shop), Garansi/Perlindungan pembeli pada dasarnya berfungsi untuk?",
    options: [
      "Menjamin harga termurah di pasar",
      "Melindungi dana pembeli sampai pesanan diterima/dikonfirmasi sesuai, sebagai penengah jika terjadi sengketa",
      "Menggantikan tugas customer service toko sepenuhnya",
      "Memberi diskon otomatis ke semua pembeli",
    ],
  },
  {
    id: "mc-03",
    type: "multiple_choice",
    text: "Pembeli menulis pesan dengan huruf kapital semua dan nada marah karena barang rusak. Respons pembuka yang paling tepat dari CS adalah?",
    options: [
      "Membalas dengan nada yang sama tegasnya",
      "Minta maaf atas ketidaknyamanannya, akui masalahnya, lalu minta bukti foto/video untuk proses lebih lanjut",
      "Menyalahkan pembeli karena kurang hati-hati",
      "Diam saja sampai pembeli tenang sendiri",
    ],
  },
  {
    id: "mc-04",
    type: "multiple_choice",
    text: "Kapan sebaiknya sebuah keluhan pembeli dieskalasi ke tim/atasan (bukan diselesaikan sendiri oleh CS baru)?",
    options: [
      "Setiap kali ada pertanyaan produk sederhana",
      "Ketika kasus melibatkan potensi kerugian besar, indikasi penipuan, atau di luar wewenang/kebijakan yang diketahui CS",
      "Tidak pernah, semua kasus wajib diselesaikan sendiri walau tidak yakin",
      "Hanya jika pembeli memberi rating bintang 5",
    ],
  },
  {
    id: "mc-05",
    type: "multiple_choice",
    text: "Pembeli minta COD (Cash on Delivery) dibatalkan setelah paket sudah dikirim oleh kurir. Sikap CS yang tepat?",
    options: [
      "Menjelaskan status pesanan, kebijakan pembatalan COD yang berlaku, dan opsi yang tersedia (mis. tolak paket saat kurir datang) secara sopan",
      "Bilang tidak bisa dan menutup chat",
      "Menyalahkan pembeli karena berubah pikiran",
      "Mengabaikan permintaan tersebut",
    ],
  },
  {
    id: "mc-06",
    type: "multiple_choice",
    text: "Apa perbedaan mendasar antara 'refund' dan 'retur' dalam konteks umum belanja online?",
    options: [
      "Keduanya sama persis",
      "Refund = pengembalian dana, retur = pengembalian barang fisik ke penjual (biasanya syarat sebelum refund penuh diproses)",
      "Refund hanya berlaku untuk barang elektronik",
      "Retur hanya bisa dilakukan lewat telepon",
    ],
  },
  {
    id: "mc-07",
    type: "multiple_choice",
    text: "Pembeli menuduh toko melakukan penipuan di chat publik/rating produk. Respons yang paling profesional?",
    options: [
      "Membalas dengan emosi dan menyalahkan balik pembeli di kolom publik",
      "Tetap tenang, jawab secara faktual dan sopan di ruang publik, lalu ajak lanjut diskusi detail lewat chat pribadi/tiket resmi",
      "Menghapus/menyembunyikan komentar tanpa menjawab",
      "Tidak merespons sama sekali",
    ],
  },
  {
    id: "mc-08",
    type: "multiple_choice",
    text: "Manakah informasi yang WAJIB diverifikasi CS sebelum memproses refund/kompensasi?",
    options: [
      "Warna favorit pembeli",
      "Nomor pesanan, bukti (foto/video) sesuai kebijakan, dan kesesuaian dengan status pesanan di sistem",
      "Jumlah pengikut media sosial pembeli",
      "Alamat email pribadi CS",
    ],
  },
  {
    id: "mc-09",
    type: "multiple_choice",
    text: "Target waktu respons (response time) yang cepat di live chat marketplace penting terutama karena?",
    options: [
      "Hanya untuk mengejar bonus internal",
      "Memengaruhi metrik performa toko (mis. tingkat respons chat) dan kepuasan/kepercayaan pembeli",
      "Tidak ada pengaruhnya sama sekali",
      "Hanya berlaku di hari besar",
    ],
  },
  {
    id: "mc-10",
    type: "multiple_choice",
    text: "Pembeli salah memasukkan alamat pengiriman dan pesanan sudah diproses toko. Tindakan CS yang tepat?",
    options: [
      "Membiarkan saja karena bukan tanggung jawab CS",
      "Segera cek apakah pesanan masih bisa diubah/dibatalkan sesuai batas waktu sistem, dan informasikan opsi yang realistis ke pembeli",
      "Menyalahkan pembeli tanpa memberi solusi",
      "Meminta pembeli menghubungi kurir sendiri tanpa bantuan apa pun",
    ],
  },
  {
    id: "mc-11",
    type: "multiple_choice",
    text: "Dalam SOP layanan pelanggan, apa fungsi utama mencatat/mengklasifikasikan setiap tiket komplain (mis. 'barang rusak', 'salah kirim', 'keterlambatan')?",
    options: [
      "Hanya formalitas administrasi tanpa manfaat",
      "Memudahkan analisis pola masalah berulang untuk perbaikan operasional dan pelaporan ke manajemen",
      "Supaya CS terlihat sibuk",
      "Untuk mempersulit proses refund",
    ],
  },
  {
    id: "mc-12",
    type: "multiple_choice",
    text: "Pembeli TikTok Shop komplain lewat kolom komentar video live bahwa pesanannya belum diproses. Prioritas tindakan CS?",
    options: [
      "Balas di kolom komentar dengan detail lengkap termasuk nomor HP pembeli",
      "Balas singkat secara sopan, arahkan ke chat/DM resmi untuk verifikasi & penyelesaian lebih lanjut agar data pribadi tetap aman",
      "Menghapus komentar tersebut tanpa tindak lanjut",
      "Mengabaikan karena live sedang berlangsung",
    ],
  },

  {
    id: "mc-13",
    type: "multiple_choice",
    text: "Pembeli Shopee mengeluh nomor resi yang diberikan tidak valid saat dicek di aplikasi kurir. Langkah CS yang paling tepat?",
    options: [
      "Bilang itu bukan urusan toko dan menyuruh pembeli menghubungi kurir sendiri",
      "Cek ulang nomor resi di sistem toko, pastikan tidak ada salah ketik/salah paste, lalu konfirmasi ulang ke pembeli",
      "Mengirim resi baru secara asal tanpa mengecek dulu",
      "Mengabaikan pesan sampai pembeli komplain lagi ke pihak marketplace",
    ],
  },
  {
    id: "mc-14",
    type: "multiple_choice",
    text: "Apa yang sebaiknya TIDAK dilakukan CS saat menjawab chat pelanggan yang sedang emosi?",
    options: [
      "Menggunakan bahasa sopan dan tetap tenang",
      "Menggunakan kata-kata yang menyalahkan atau meremehkan keluhan pelanggan",
      "Meminta maaf atas ketidaknyamanan yang dialami",
      "Menawarkan solusi konkret sesuai kebijakan toko",
    ],
  },
  {
    id: "mc-15",
    type: "multiple_choice",
    text: "Pembeli bertanya status pesanan yang masih 'Diproses' padahal sudah 3 hari, dan CS sendiri belum tahu penyebabnya. Sikap paling tepat?",
    options: [
      "Berbohong bilang barang sudah dikirim supaya pembeli tenang",
      "Jujur bahwa sedang dicek ke bagian gudang/pengiriman, beri estimasi waktu update, dan follow up sesuai janji",
      "Tidak membalas sampai statusnya berubah sendiri",
      "Menyuruh pembeli membatalkan pesanan saja",
    ],
  },
  {
    id: "mc-16",
    type: "multiple_choice",
    text: "Dalam menangani banyak chat sekaligus di jam sibuk, prioritas penanganan yang paling wajar adalah?",
    options: [
      "Asal urut siapa yang paling ramai membalas",
      "Dahulukan kasus yang lebih mendesak/berisiko (mis. dugaan penipuan, pesanan mau lewat batas waktu) tanpa mengabaikan chat lain terlalu lama",
      "Hanya membalas pembeli dengan rating tinggi",
      "Menutup semua chat dan menjawab besok",
    ],
  },
  {
    id: "mc-17",
    type: "multiple_choice",
    text: "Pembeli minta data pribadi CS (nomor WhatsApp pribadi/alamat rumah) di luar sistem resmi toko. Respons yang tepat?",
    options: [
      "Langsung memberikan karena ingin membantu lebih cepat",
      "Menolak dengan sopan dan menjelaskan bahwa komunikasi tetap dilakukan lewat chat/aplikasi resmi demi keamanan kedua pihak",
      "Memblokir pembeli tanpa penjelasan",
      "Memberikan nomor rekan kerja lain sebagai gantinya",
    ],
  },
  {
    id: "mc-18",
    type: "multiple_choice",
    text: "Apa tujuan utama CS mengonfirmasi ulang (misal membacakan kembali) detail komplain pembeli sebelum memproses solusi?",
    options: [
      "Membuang-buang waktu percakapan",
      "Memastikan tidak ada kesalahpahaman soal masalah/data sebelum solusi diproses, sehingga mengurangi risiko salah tindak",
      "Supaya terlihat sibuk di depan atasan",
      "Tidak ada tujuannya, hanya basa-basi",
    ],
  },

  // ---------- TES FOKUS / KETELITIAN (cocokkan dua deret) ----------
  // Tipe ini menguji ketelitian kandidat membandingkan dua deret angka/kode,
  // skill yang relevan untuk mencocokkan nomor resi, nomor pesanan, dsb.
  {
    id: "fc-01",
    type: "focus_match",
    text: "Perhatikan dua deret berikut. Apakah keduanya SAMA PERSIS atau BERBEDA?",
    pairA: "23718327183721",
    pairB: "23718327183721",
  },
  {
    id: "fc-02",
    type: "focus_match",
    text: "Perhatikan dua deret berikut. Apakah keduanya SAMA PERSIS atau BERBEDA?",
    pairA: "23718327183721",
    pairB: "23718327183712",
  },
  {
    id: "fc-03",
    type: "focus_match",
    text: "Perhatikan dua deret berikut. Apakah keduanya SAMA PERSIS atau BERBEDA?",
    pairA: "SPXID0098172633",
    pairB: "SPXID0098172633",
  },
  {
    id: "fc-04",
    type: "focus_match",
    text: "Perhatikan dua deret berikut. Apakah keduanya SAMA PERSIS atau BERBEDA?",
    pairA: "SPXID0098172633",
    pairB: "SPXID0098712633",
  },
  {
    id: "fc-05",
    type: "focus_match",
    text: "Perhatikan dua deret berikut. Apakah keduanya SAMA PERSIS atau BERBEDA?",
    pairA: "INV-2026-081204-JKT",
    pairB: "INV-2026-081204-JKT",
  },
  {
    id: "fc-06",
    type: "focus_match",
    text: "Perhatikan dua deret berikut. Apakah keduanya SAMA PERSIS atau BERBEDA?",
    pairA: "INV-2026-081204-JKT",
    pairB: "INV-2026-081240-JKT",
  },
  {
    id: "fc-07",
    type: "focus_match",
    text: "Perhatikan dua deret berikut. Apakah keduanya SAMA PERSIS atau BERBEDA?",
    pairA: "081234567890",
    pairB: "081234567890",
  },
  {
    id: "fc-08",
    type: "focus_match",
    text: "Perhatikan dua deret berikut. Apakah keduanya SAMA PERSIS atau BERBEDA?",
    pairA: "081234567890",
    pairB: "081234657890",
  },

  // ---------- ESSAY / SKENARIO TERTULIS ----------
  {
    id: "es-01",
    type: "essay",
    text:
      "Tuliskan contoh balasan chat (2-4 kalimat) untuk pembeli yang komplain menerima produk berbeda warna dari yang dipesan di Shopee. Gunakan nada sopan, empatik, dan solutif.",
  },
  {
    id: "es-02",
    type: "essay",
    text:
      "Seorang pembeli TikTok Shop meminta refund penuh padahal video unboxing yang ia kirim tidak menunjukkan kerusakan yang jelas, dan kebijakan toko mensyaratkan bukti jelas untuk refund. Bagaimana kamu menjelaskan situasi ini ke pembeli tanpa membuatnya makin marah?",
  },
  {
    id: "es-03",
    type: "essay",
    text:
      "Jelaskan singkat bagaimana kamu akan menangani pembeli yang memberi rating bintang 1 disertai ulasan negatif, padahal menurut catatan sistem pesanan sudah terkirim tepat waktu dan sesuai pesanan.",
  },
  {
    id: "es-04",
    type: "essay",
    text:
      "Menurutmu, apa 3 hal terpenting yang harus dimiliki seorang CS e-commerce agar pembeli tetap percaya pada toko meskipun sedang komplain? Jelaskan singkat alasannya.",
  },
  {
    id: "es-05",
    type: "essay",
    text:
      "Ceritakan pengalamanmu (atau bayangkan situasinya) saat harus menangani dua komplain berbeda dari dua pembeli di waktu bersamaan. Bagaimana kamu mengatur prioritas dan waktu supaya keduanya tetap terlayani dengan baik?",
  },
  {
    id: "es-06",
    type: "essay",
    text:
      "Seorang pembeli sudah 3x membalas dengan nada semakin kesal karena merasa masalahnya belum juga selesai, padahal menurutmu kamu sudah menjelaskan solusinya dengan jelas. Apa yang akan kamu lakukan selanjutnya?",
  },
];

// Hitung total soal per tipe untuk keperluan skor & progres
const MC_QUESTIONS = QUESTION_BANK.filter((q) => q.type === "multiple_choice");
const FOCUS_QUESTIONS = QUESTION_BANK.filter((q) => q.type === "focus_match");
const ESSAY_QUESTIONS = QUESTION_BANK.filter((q) => q.type === "essay");
