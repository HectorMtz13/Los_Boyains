const { Router } = require("express");
const ctrl = require("./pos.controller");
const { requireAuth } = require("../../middleware/auth"); // PBI-003

const router = Router();

// Todas las rutas del POS requieren sesión activa (PBI-003)
router.use(requireAuth);

// ── Carrito (PBI-015) ──────────────────────────────────────
router.post("/carrito/calcular",      ctrl.calcularCarrito);
router.post("/carrito/validar-stock", ctrl.validarStockCarrito);

// ── Ventas ─────────────────────────────────────────────────
router.get("/",       ctrl.listarVentas);
router.post("/",      ctrl.crearVentaValidada);  // PBI-015
router.get("/:id",    ctrl.detalleVenta);
router.delete("/:id", ctrl.eliminarVenta);

module.exports = router;