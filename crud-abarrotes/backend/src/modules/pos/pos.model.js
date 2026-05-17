
// POS MODEL  —  ventas con carrito multi-producto

const { openDb } = require("../../config/db");

// Crear una venta completa con su detalle (carrito)
// items = [{ id_producto, cantidad, precio_unitario }]
exports.crearVenta = async ({ id_Cliente, id_Empleado, descuento = 0, items = [], fecha }) => {
  const db   = await openDb();
  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // 1. Calcular total bruto
    let subtotalBruto = 0;
    for (const it of items) {
      subtotalBruto += it.cantidad * it.precio_unitario;
    }
    const total = Math.max(0, subtotalBruto - descuento);

    // 2. Insertar cabecera de venta
    const fechaVenta = fecha || new Date().toISOString().slice(0, 10);
    const [ventaRes] = await conn.execute(
      `INSERT INTO Venta (id_Cliente, id_Empleado, id_Producto, cantidad, fecha, total, descuento)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id_Cliente  || null,
        id_Empleado || null,
        items[0]?.id_producto || null,
        items.reduce((s, i) => s + i.cantidad, 0),
        fechaVenta,
        total,
        descuento
      ]
    );
    const id_venta = ventaRes.insertId;

    // 3. Insertar detalle y descontar stock producto por producto
    for (const it of items) {
      const subtotal = it.cantidad * it.precio_unitario;

      await conn.execute(
        `INSERT INTO Detalle_Venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [id_venta, it.id_producto, it.cantidad, it.precio_unitario, subtotal]
      );

      // Verificar stock suficiente (bloqueo a nivel de fila)
      const [[prod]] = await conn.execute(
        "SELECT Cantidad_producto, Nombre_producto FROM Producto WHERE id = ? FOR UPDATE",
        [it.id_producto]
      );
      if (!prod || prod.Cantidad_producto < it.cantidad) {
        throw new Error(`Stock insuficiente para "${prod?.Nombre_producto ?? it.id_producto}"`);
      }

      // Descontar stock
      await conn.execute(
        "UPDATE Producto SET Cantidad_producto = Cantidad_producto - ? WHERE id = ?",
        [it.cantidad, it.id_producto]
      );
    }

    await conn.commit();
    return { id_venta, total, items: items.length };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Listar ventas con resumen
exports.getVentas = async (q = "") => {
  const db   = await openDb();
  const like = `%${q}%`;
  const [rows] = await db.execute(
    `SELECT v.id_Venta, v.fecha, v.total, v.descuento,
            c.Nombre_Cliente, e.Nombre_Empleado,
            COUNT(dv.id_detalle) AS num_productos
     FROM Venta v
     LEFT JOIN Cliente  c  ON v.id_Cliente  = c.id_Cliente
     LEFT JOIN Empleado e  ON v.id_Empleado = e.Id_Empleado
     LEFT JOIN Detalle_Venta dv ON dv.id_venta = v.id_Venta
     WHERE COALESCE(c.Nombre_Cliente,'') LIKE ?
        OR CAST(v.id_Venta AS CHAR) LIKE ?
     GROUP BY v.id_Venta
     ORDER BY v.id_Venta DESC`,
    [like, like]
  );
  return rows;
};

// Detalle completo de una venta (ticket)
exports.getDetalle = async (id_venta) => {
  const db = await openDb();
  const [[venta]] = await db.execute(
    `SELECT v.*, c.Nombre_Cliente, e.Nombre_Empleado
     FROM Venta v
     LEFT JOIN Cliente  c ON v.id_Cliente  = c.id_Cliente
     LEFT JOIN Empleado e ON v.id_Empleado = e.Id_Empleado
     WHERE v.id_Venta = ?`,
    [id_venta]
  );
  if (!venta) return null;

  const [items] = await db.execute(
    `SELECT dv.*, p.Nombre_producto, p.unidad_medida
     FROM Detalle_Venta dv
     JOIN Producto p ON dv.id_producto = p.id
     WHERE dv.id_venta = ?`,
    [id_venta]
  );
  return { ...venta, items };
};

exports.eliminarVenta = async (id_venta) => {
  const db = await openDb();
  await db.execute("DELETE FROM Venta WHERE id_Venta = ?", [id_venta]);
};
// PBI-015  —  Editar carrito: cantidades, eliminación y descuentos

exports.calcularCarrito = ({ items = [], descuento = 0 }) => {
  const alertas = [];

  const itemsValidos = items
    .map(it => ({ ...it, cantidad: Math.max(1, parseInt(it.cantidad) || 1) }))
    .filter(it => it.id_producto);

  const itemsConSubtotal = itemsValidos.map(it => ({
    ...it,
    subtotal: parseFloat((it.cantidad * it.precio_unitario).toFixed(2))
  }));

  const subtotal = parseFloat(
    itemsConSubtotal.reduce((acc, it) => acc + it.subtotal, 0).toFixed(2)
  );

  const descuentoNum = Math.max(0, parseFloat(descuento) || 0);
  if (descuentoNum > subtotal) {
    alertas.push("El descuento no puede superar el subtotal. Se ajustó al máximo.");
  }
  const descuentoFinal = Math.min(descuentoNum, subtotal);
  const total = parseFloat(Math.max(0, subtotal - descuentoFinal).toFixed(2));

  return { items: itemsConSubtotal, subtotal, descuento: descuentoFinal, total, alertas };
};

exports.validarStockCarrito = async (items = []) => {
  const db = await openDb();
  const errores = [];

  for (const it of items) {
    const [[prod]] = await db.execute(
      "SELECT Nombre_producto, Cantidad_producto, activo FROM Producto WHERE id = ?",
      [it.id_producto]
    );
    if (!prod) {
      errores.push(`Producto id=${it.id_producto} no encontrado`);
      continue;
    }
    if (!prod.activo) {
      errores.push(`"${prod.Nombre_producto}" está inactivo`);
      continue;
    }
    if (prod.Cantidad_producto < it.cantidad) {
      errores.push(
        `Stock insuficiente para "${prod.Nombre_producto}". Disponible: ${prod.Cantidad_producto}, solicitado: ${it.cantidad}`
      );
    }
  }
  return errores;
};
