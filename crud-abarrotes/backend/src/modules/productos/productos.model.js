const { openDb } = require("../../config/db");

exports.getAll = async (q = "", soloActivos = true) => {
  const db = await openDb();
  const like = `%${q}%`;
  const activoFiltro = soloActivos ? "AND p.activo = 1" : "";
  const [rows] = await db.execute(
    `SELECT p.*,
            MAX(cb.codigo_barras) AS codigo_barras
     FROM Producto p
     LEFT JOIN Codigo_Barras cb ON cb.id_producto = p.id
     WHERE (p.Nombre_producto LIKE ? OR p.Categoria_Producto LIKE ?) ${activoFiltro}
     GROUP BY p.id
     ORDER BY p.id`,
    [like, like]
  );
  return rows;
};

exports.getById = async (id) => {
  const db = await openDb();
  const [rows] = await db.execute(
    "SELECT * FROM Producto WHERE id = ?",
    [id]
  );
  return rows[0];
};

exports.create = async (data) => {
  const db = await openDb();
  const {
    Nombre_producto,
    Cantidad_producto = 0,
    Precio_Producto   = 0,
    precio_compra     = 0,
    Categoria_Producto = null,
    stock_minimo      = 5,
    unidad_medida     = "pieza",
    activo            = 1,
  } = data;

  // Validaciones
  if (parseFloat(Precio_Producto) < 0)  throw new Error("El precio de venta no puede ser negativo");
  if (parseFloat(precio_compra)   < 0)  throw new Error("El precio de compra no puede ser negativo");
  if (parseInt(Cantidad_producto) < 0)  throw new Error("El stock no puede ser negativo");

  const [result] = await db.execute(
    `INSERT INTO Producto
       (Nombre_producto, Cantidad_producto, Precio_Producto, precio_compra,
        Categoria_Producto, stock_minimo, unidad_medida, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [Nombre_producto, Cantidad_producto, Precio_Producto, precio_compra,
     Categoria_Producto, stock_minimo, unidad_medida, activo]
  );
  return { id: result.insertId, ...data };
};

exports.update = async (id, data) => {
  const db = await openDb();
  const {
    Nombre_producto,
    Cantidad_producto,
    Precio_Producto,
    precio_compra,
    Categoria_Producto,
    stock_minimo,
    unidad_medida,
    activo,
  } = data;

  // Validaciones
  if (parseFloat(Precio_Producto) < 0)  throw new Error("El precio de venta no puede ser negativo");
  if (parseFloat(precio_compra)   < 0)  throw new Error("El precio de compra no puede ser negativo");
  if (parseInt(Cantidad_producto) < 0)  throw new Error("El stock no puede ser negativo");

  await db.execute(
    `UPDATE Producto SET
       Nombre_producto=?, Cantidad_producto=?, Precio_Producto=?,
       precio_compra=?, Categoria_Producto=?, stock_minimo=?,
       unidad_medida=?, activo=?,
       fecha_modificacion = NOW()
     WHERE id=?`,
    [Nombre_producto, Cantidad_producto, Precio_Producto,
     precio_compra ?? 0, Categoria_Producto, stock_minimo ?? 5,
     unidad_medida ?? "pieza", activo ?? 1, id]
  );
  return { id, ...data };
};

exports.remove = async (id) => {
  const db = await openDb();
  await db.execute("DELETE FROM Producto WHERE id = ?", [id]);
};

// PBI-006: buscar producto activo por código de barras
exports.getByCodigoBarras = async (codigo) => {
  const db = await openDb();
  const [rows] = await db.execute(
    `SELECT p.*
     FROM Producto p
     JOIN Codigo_Barras cb ON cb.id_producto = p.id
     WHERE cb.codigo_barras = ? AND p.activo = 1
     LIMIT 1`,
    [codigo]
  );
  return rows[0] || null;
};

// PBI-007: crear producto con código de barras en una sola operación
exports.createConCodigo = async (data) => {
  const db = await openDb();
  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    const {
      Nombre_producto,
      Cantidad_producto = 0,
      Precio_Producto = 0,
      precio_compra = 0,
      Categoria_Producto = null,
      stock_minimo = 5,
      unidad_medida = "pieza",
      codigo_barras
    } = data;

    // 1. Insertar producto
    const [result] = await conn.execute(
      `INSERT INTO Producto
         (Nombre_producto, Cantidad_producto, Precio_Producto, precio_compra,
          Categoria_Producto, stock_minimo, unidad_medida, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [Nombre_producto, Cantidad_producto, Precio_Producto, precio_compra,
       Categoria_Producto, stock_minimo, unidad_medida]
    );
    const id_producto = result.insertId;

    // 2. Insertar código de barras si viene
    if (codigo_barras) {
      await conn.execute(
        "INSERT INTO Codigo_Barras (id_producto, codigo_barras) VALUES (?, ?)",
        [id_producto, codigo_barras]
      );
    }

    await conn.commit();
    return { id: id_producto, ...data };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};