// public/js/guard.js
// Mendeteksi kandidat meninggalkan halaman tes (buka tab baru, pindah tab,
// minimize browser/aplikasi, atau menutup halaman). Begitu terdeteksi,
// callback dipanggil SEKALI dan tes diakhiri otomatis oleh halaman yang memakainya.

window.Guard = (function () {
  let fired = false;
  return {
    start: function (onViolation) {
      function trigger() {
        if (fired) return;
        fired = true;
        try { onViolation(); } catch (e) { /* abaikan */ }
      }
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) trigger();
      });
    },
  };
})();
