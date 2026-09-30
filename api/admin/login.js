// api/admin/login.js
// POST { password } -> { token } kalau cocok dengan ADMIN_PASSWORD

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body || {};
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const token = process.env.ADMIN_API_TOKEN;

  if (!expectedPassword || !token) {
    return res.status(500).json({ error: "ADMIN_PASSWORD / ADMIN_API_TOKEN belum di-set di server." });
  }

  if (!password || password !== expectedPassword) {
    return res.status(401).json({ error: "Password admin salah." });
  }

  return res.status(200).json({ token });
};
