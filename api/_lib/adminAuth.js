// api/_lib/adminAuth.js
// Auth admin sederhana berbasis token statis (cocok untuk internal tool skala kecil).
// Admin login (api/admin-login.js) mengecek password lalu mengembalikan ADMIN_API_TOKEN.
// Endpoint admin lain memverifikasi header: Authorization: Bearer <ADMIN_API_TOKEN>

function requireAdmin(req, res) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    res.status(500).json({ error: "ADMIN_API_TOKEN belum di-set di server." });
    return false;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token || token !== expected) {
    res.status(401).json({ error: "Unauthorized. Silakan login ulang." });
    return false;
  }

  return true;
}

module.exports = { requireAdmin };
