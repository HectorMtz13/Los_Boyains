const model = require("./pos.model");

// GET /api/pos  — lista de ventas
exports.listarVentas = async (req, res) => {
  try {
    const data = await model.getVentas(req.query.q || "");
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener ventas" });
  }
};

// GET /api/pos/:id  — detalle/ticket de una venta
exports.detalleVenta = async (req, res) => {
  try {
    const venta = await model.getDetalle(req.params.id);
    if (!venta) return res.status(404).json({ error: "Venta no encontrada" });
    res.json({ data: venta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener detalle" });
  }
};

// DELETE /api/pos/:id  — cancelar venta
exports.eliminarVenta = async (req, res) => {
  try {
    await model.eliminarVenta(req.params.id);
    res.json({ mensaje: "Venta eliminada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar venta" });
  }
};

// ── PBI-015 ────────────────────────────────────────────────────

// POST /api/pos/carrito/calcular
exports.calcularCarrito = (req, res) => {
  try {
    const { items, descuento } = req.body;
    if (!items || !items.length)
      return res.status(400).json({ error: "El carrito está vacío" });
    const resultado = model.calcularCarrito({ items, descuento });
    res.json({ data: resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al calcular carrito" });
  }
};

// POST /api/pos/carrito/validar-stock
exports.validarStockCarrito = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !items.length)
      return res.status(400).json({ error: "El carrito está vacío" });
    const errores = await model.validarStockCarrito(items);
    res.json({ ok: errores.length === 0, errores });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al validar stock" });
  }
};

// POST /api/pos  — confirmar carrito con todas las validaciones PBI-015
exports.crearVentaValidada = async (req, res) => {
  try {
    const { id_Cliente, descuento, items, fecha } = req.body;
    const id_Empleado = req.user.id_empleado; // viene del token de sesión (PBI-003)
    const rol         = req.user.rol;

    if (!items || !items.length)
      return res.status(400).json({ error: "El carrito está vacío" });

    // 1. Recalcular con reglas PBI-015
    const carrito = model.calcularCarrito({ items, descuento });

    // 2. Descuento > 10% requiere rol gerente (PBI-015 + PBI-003)
    const UMBRAL = 0.10;
    if (
      carrito.subtotal > 0 &&
      carrito.descuento / carrito.subtotal > UMBRAL &&
      rol !== "gerente" && rol !== "admin"
    ) {
      return res.status(403).json({
        error: `Descuento mayor al ${UMBRAL * 100}% requiere rol de gerente`
      });
    }

    // 3. Validar stock
    const erroresStock = await model.validarStockCarrito(carrito.items);
    if (erroresStock.length)
      return res.status(409).json({ error: erroresStock.join("; ") });

    // 4. Persistir
    const result = await model.crearVenta({
      id_Cliente,
      id_Empleado,
      descuento: carrito.descuento,
      items: carrito.items,
      fecha
    });

    res.status(201).json({
      mensaje: "Venta registrada ✓",
      data: { ...result, total: carrito.total, alertas: carrito.alertas }
    });
  } catch (err) {
    console.error(err);
    const status = err.message.includes("Stock") ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
};