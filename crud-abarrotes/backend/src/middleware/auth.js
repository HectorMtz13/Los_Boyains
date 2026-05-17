// PBI-003 — Middleware de autenticación
// Lee el header x-usuario-id que el frontend manda tras el login
// y adjunta { id_usuario, rol, id_empleado } en req.user

const { openDb } = require("../config/db");

async function requireAuth(req, res, next) {
  const uid = req.headers["x-usuario-id"];
  if (!uid) return res.status(401).json({ error: "No has iniciado sesión" });

  try {
    const db = await openDb();
    const [rows] = await db.execute(
      `SELECT u.id_usuario, u.rol, e.id_empleado AS id_empleado
       FROM Usuario u
       JOIN Empleado e ON u.id_empleado = e.id_empleado
       WHERE u.id_usuario = ? AND u.activo = 1`,
      [parseInt(uid, 10)]
    );
    if (!rows.length)
      return res.status(401).json({ error: "Sesión inválida o usuario inactivo" });

    req.user = rows[0]; // { id_usuario, rol, id_empleado }
    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    res.status(500).json({ error: "Error al verificar sesión" });
  }
}

module.exports = { requireAuth };
