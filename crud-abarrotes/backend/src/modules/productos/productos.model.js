const { openDb } = require("../../config/db");

exports.getAll = async () => {
  const db = await openDb();
  const [rows] = await db.execute("SELECT * FROM Producto");
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
  const { Nombre_producto, Cantidad_producto, Precio_Producto, Categoria_Producto } = data;

  const [result] = await db.execute(
    "INSERT INTO Producto (Nombre_producto, Cantidad_producto, Precio_Producto, Categoria_Producto) VALUES (?, ?, ?, ?)",
    [Nombre_producto, Cantidad_producto, Precio_Producto, Categoria_Producto]
  );

  return { id: result.insertId, ...data };
};

exports.update = async (id, data) => {
  const db = await openDb();
  const { Nombre_producto, Cantidad_producto, Precio_Producto, Categoria_Producto } = data;

  await db.execute(
    "UPDATE Producto SET Nombre_producto=?, Cantidad_producto=?, Precio_Producto=?, Categoria_Producto=? WHERE id=?",
    [Nombre_producto, Cantidad_producto, Precio_Producto, Categoria_Producto, id]
  );

  return { id, ...data };
};

exports.remove = async (id) => {
  const db = await openDb();
  await db.execute("DELETE FROM Producto WHERE id = ?", [id]);
};