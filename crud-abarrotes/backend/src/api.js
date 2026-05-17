const express = require("express");
const { openDb } = require("./config/db");
const crypto = require("crypto");
const { requireAuth } = require("./middleware/auth"); // PBI-003

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function apiRouter() {
  const router = express.Router();

  // ========================= AUTH =========================
  router.post("/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log("🔐 Intento de login:", username);
      if (!username || !password)
        return res.status(400).json({ error: "Usuario y contraseña son obligatorios" });

      const db = await openDb();
      const [rows] = await db.execute(
        `SELECT u.id_usuario, u.username, u.password_hash, u.rol, u.activo,
                e.Id_Empleado, e.Nombre_Empleado
         FROM Usuario u
         JOIN Empleado e ON u.id_empleado = e.Id_Empleado
         WHERE u.username = ? AND u.activo = 1`,
        [username]
      );
      console.log("👤 Usuarios encontrados:", rows.length);
      if (!rows.length)
        return res.status(401).json({ error: "Usuario no encontrado o inactivo" });

      const user = rows[0];
      const hashIngresado = sha256(password);
      const hashGuardado  = (user.password_hash || "").toLowerCase();
      console.log("🔑 Hash ingresado:", hashIngresado);
      console.log("🔑 Hash en BD:    ", hashGuardado);
      console.log("✅ ¿Coinciden?    ", hashIngresado === hashGuardado);

      if (hashIngresado !== hashGuardado)
        return res.status(401).json({ error: "Credenciales incorrectas" });

      res.json({
        id_usuario:      user.id_usuario,
        username:        user.username,
        rol:             user.rol,
        nombre_empleado: user.Nombre_Empleado,
        id_empleado:     user.Id_Empleado
      });
    } catch (err) {
      console.error("❌ Error en login:", err);
      res.status(500).json({ error: "Error al iniciar sesión: " + err.message });
    }
  });

  router.get("/auth/me", requireAuth, async (req, res) => {
    try {
      const db = await openDb();
      const [rows] = await db.execute(
        `SELECT u.id_usuario, u.username, u.rol,
                e.Id_Empleado, e.Nombre_Empleado
         FROM Usuario u
         JOIN Empleado e ON u.id_empleado = e.Id_Empleado
         WHERE u.id_usuario = ? AND u.activo = 1`,
        [req.user.id_usuario]
      );
      if (!rows.length)
        return res.status(401).json({ error: "Sesión inválida" });

      const u = rows[0];
      res.json({
        id_usuario:      u.id_usuario,
        username:        u.username,
        rol:             u.rol,
        nombre_empleado: u.Nombre_Empleado,
        id_empleado:     u.Id_Empleado
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al verificar sesión" });
    }
  });

  router.post("/auth/setup", async (req, res) => {
    try {
      const { clave_admin, username, password, rol } = req.body;
      if (clave_admin !== "base_datos123")
        return res.status(403).json({ error: "Clave de administrador incorrecta" });
      if (!username || !password)
        return res.status(400).json({ error: "Usuario y contraseña son obligatorios" });

      const db = await openDb();
      const hashNuevo = sha256(password);
      const [existe] = await db.execute(
        "SELECT id_usuario FROM Usuario WHERE username = ?", [username]
      );

      if (existe.length) {
        await db.execute(
          "UPDATE Usuario SET password_hash = ? WHERE username = ?",
          [hashNuevo, username]
        );
        return res.json({ ok: true, mensaje: `Contraseña de '${username}' actualizada — ya puedes iniciar sesión` });
      }

      const [emp] = await db.execute(
        "INSERT INTO Empleado (Nombre_Empleado, Puesto) VALUES (?, 'Gerente')",
        [username]
      );
      await db.execute(
        "INSERT INTO Usuario (id_empleado, username, password_hash, rol) VALUES (?, ?, ?, ?)",
        [emp.insertId, username, hashNuevo, rol || "gerente"]
      );
      res.json({ ok: true, mensaje: `Usuario '${username}' creado correctamente — ya puedes iniciar sesión` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al crear usuario: " + err.message });
    }
  });

  // ========================= PRODUCTOS =========================
  router.get("/productos", async (req, res) => {
    try {
      const db = await openDb();
      const q = req.query.q ? `%${req.query.q}%` : "%";
      const [rows] = await db.execute(
        `SELECT p.*, cb.codigo_barras
         FROM Producto p
         LEFT JOIN Codigo_Barras cb ON cb.id_producto = p.id
         WHERE (COALESCE(p.Nombre_producto,'') LIKE ? OR COALESCE(p.Categoria_Producto,'') LIKE ?)
         GROUP BY p.id
         ORDER BY p.id`,
        [q, q]
      );
      res.json({ data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener productos" });
    }
  });

  router.post("/productos", async (req, res) => {
    try {
      const db = await openDb();
      const {
        Nombre_producto, Cantidad_producto, Precio_Producto,
        Categoria_Producto, precio_compra, stock_minimo, unidad_medida
      } = req.body;
      if (!Nombre_producto)
        return res.status(400).json({ error: "Nombre_producto es obligatorio" });
      await db.execute(
        `INSERT INTO Producto
           (Nombre_producto, Cantidad_producto, Precio_Producto, Categoria_Producto,
            precio_compra, stock_minimo, unidad_medida, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [Nombre_producto, Cantidad_producto||0, Precio_Producto||0,
         Categoria_Producto||null, precio_compra||0, stock_minimo||5, unidad_medida||"pieza"]
      );
      res.json({ mensaje: "Producto creado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al crear producto" });
    }
  });

  router.put("/productos/:id", async (req, res) => {
    try {
      const db = await openDb();
      const {
        Nombre_producto, Cantidad_producto, Precio_Producto,
        Categoria_Producto, precio_compra, stock_minimo, unidad_medida, activo
      } = req.body;
      await db.execute(
        `UPDATE Producto SET
           Nombre_producto=?, Cantidad_producto=?, Precio_Producto=?,
           Categoria_Producto=?, precio_compra=?, stock_minimo=?,
           unidad_medida=?, activo=?, fecha_modificacion=NOW()
         WHERE id=?`,
        [Nombre_producto, Cantidad_producto||0, Precio_Producto||0,
         Categoria_Producto||null, precio_compra??0, stock_minimo??5,
         unidad_medida||"pieza", activo??1, req.params.id]
      );
      res.json({ mensaje: "Producto actualizado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al actualizar producto" });
    }
  });

  // PBI-012: activar o inactivar producto sin borrar historial
  router.patch("/productos/:id/activo", async (req, res) => {
    try {
      const db = await openDb();
      const { activo } = req.body;
      await db.execute(
        "UPDATE Producto SET activo = ? WHERE id = ?",
        [activo ? 1 : 0, req.params.id]
      );
      res.json({ mensaje: activo ? "Producto activado" : "Producto inactivado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al cambiar estado del producto" });
    }
  });

  router.delete("/productos/:id", async (req, res) => {
    try {
      const db = await openDb();
      await db.execute("DELETE FROM Producto WHERE id=?", [req.params.id]);
      res.json({ mensaje: "Producto eliminado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar producto" });
    }
  });

  // ========================= CLIENTES =========================
  router.get("/clientes", async (req, res) => {
    try {
      const db = await openDb();
      const q = req.query.q ? `%${req.query.q}%` : "%";
      const [rows] = await db.execute(
        "SELECT * FROM Cliente WHERE Nombre_Cliente LIKE ? OR email LIKE ? ORDER BY id_Cliente",
        [q, q]
      );
      res.json({ data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener clientes" });
    }
  });

  router.post("/clientes", async (req, res) => {
    try {
      const db = await openDb();
      const { Nombre_Cliente, telefono, email } = req.body;
      if (!Nombre_Cliente)
        return res.status(400).json({ error: "Nombre_Cliente es obligatorio" });
      await db.execute(
        "INSERT INTO Cliente (Nombre_Cliente, telefono, email) VALUES (?, ?, ?)",
        [Nombre_Cliente, telefono||null, email||null]
      );
      res.json({ mensaje: "Cliente creado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al crear cliente" });
    }
  });

  router.put("/clientes/:id", async (req, res) => {
    try {
      const db = await openDb();
      const { Nombre_Cliente, telefono, email } = req.body;
      await db.execute(
        "UPDATE Cliente SET Nombre_Cliente=?, telefono=?, email=? WHERE id_Cliente=?",
        [Nombre_Cliente, telefono||null, email||null, req.params.id]
      );
      res.json({ mensaje: "Cliente actualizado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al actualizar cliente" });
    }
  });

  router.delete("/clientes/:id", async (req, res) => {
    try {
      const db = await openDb();
      await db.execute("DELETE FROM Cliente WHERE id_Cliente=?", [req.params.id]);
      res.json({ mensaje: "Cliente eliminado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar cliente" });
    }
  });

  // ========================= PROVEEDORES =========================
  router.get("/proveedores", async (req, res) => {
    try {
      const db = await openDb();
      const q = req.query.q ? `%${req.query.q}%` : "%";
      const [rows] = await db.execute(
        "SELECT * FROM Proveedor WHERE Nombre_proveedor LIKE ? OR email LIKE ? ORDER BY id_proveedor",
        [q, q]
      );
      res.json({ data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener proveedores" });
    }
  });

  router.post("/proveedores", async (req, res) => {
    try {
      const db = await openDb();
      const { Nombre_proveedor, telefono, email } = req.body;
      if (!Nombre_proveedor)
        return res.status(400).json({ error: "Nombre_proveedor es obligatorio" });
      await db.execute(
        "INSERT INTO Proveedor (Nombre_proveedor, telefono, email) VALUES (?, ?, ?)",
        [Nombre_proveedor, telefono||null, email||null]
      );
      res.json({ mensaje: "Proveedor creado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al crear proveedor" });
    }
  });

  router.put("/proveedores/:id", async (req, res) => {
    try {
      const db = await openDb();
      const { Nombre_proveedor, telefono, email } = req.body;
      await db.execute(
        "UPDATE Proveedor SET Nombre_proveedor=?, telefono=?, email=? WHERE id_proveedor=?",
        [Nombre_proveedor, telefono||null, email||null, req.params.id]
      );
      res.json({ mensaje: "Proveedor actualizado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al actualizar proveedor" });
    }
  });

  router.delete("/proveedores/:id", async (req, res) => {
    try {
      const db = await openDb();
      await db.execute("DELETE FROM Proveedor WHERE id_proveedor=?", [req.params.id]);
      res.json({ mensaje: "Proveedor eliminado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar proveedor" });
    }
  });

  // ========================= EMPLEADOS =========================
  router.get("/empleados", async (req, res) => {
    try {
      const db = await openDb();
      const q = req.query.q ? `%${req.query.q}%` : "%";
      const [rows] = await db.execute(
        `SELECT e.*, a.Nombre_Area FROM Empleado e
         LEFT JOIN Area a ON e.id_Area = a.id_Area
         WHERE e.Nombre_Empleado LIKE ? OR e.Puesto LIKE ?
         ORDER BY e.Id_Empleado`,
        [q, q]
      );
      res.json({ data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener empleados" });
    }
  });

  router.post("/empleados", async (req, res) => {
    try {
      const db = await openDb();
      const { Nombre_Empleado, Puesto, id_Area } = req.body;
      if (!Nombre_Empleado)
        return res.status(400).json({ error: "Nombre_Empleado es obligatorio" });
      await db.execute(
        "INSERT INTO Empleado (Nombre_Empleado, Puesto, id_Area) VALUES (?, ?, ?)",
        [Nombre_Empleado, Puesto||null, id_Area||null]
      );
      res.json({ mensaje: "Empleado creado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al crear empleado" });
    }
  });

  router.put("/empleados/:id", async (req, res) => {
    try {
      const db = await openDb();
      const { Nombre_Empleado, Puesto, id_Area } = req.body;
      await db.execute(
        "UPDATE Empleado SET Nombre_Empleado=?, Puesto=?, id_Area=? WHERE Id_Empleado=?",
        [Nombre_Empleado, Puesto||null, id_Area||null, req.params.id]
      );
      res.json({ mensaje: "Empleado actualizado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al actualizar empleado" });
    }
  });

  router.delete("/empleados/:id", async (req, res) => {
    try {
      const db = await openDb();
      await db.execute("DELETE FROM Empleado WHERE Id_Empleado=?", [req.params.id]);
      res.json({ mensaje: "Empleado eliminado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar empleado" });
    }
  });

  // ========================= AREAS =========================
  router.get("/areas", async (req, res) => {
    try {
      const db = await openDb();
      const [rows] = await db.execute("SELECT * FROM Area ORDER BY id_Area");
      res.json({ data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener áreas" });
    }
  });

  router.post("/areas", async (req, res) => {
    try {
      const db = await openDb();
      const { Nombre_Area, Descripcion } = req.body;
      if (!Nombre_Area)
        return res.status(400).json({ error: "Nombre_Area es obligatorio" });
      await db.execute(
        "INSERT INTO Area (Nombre_Area, Descripcion) VALUES (?, ?)",
        [Nombre_Area, Descripcion||null]
      );
      res.json({ mensaje: "Área creada" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al crear área" });
    }
  });

  router.put("/areas/:id", async (req, res) => {
    try {
      const db = await openDb();
      const { Nombre_Area, Descripcion } = req.body;
      await db.execute(
        "UPDATE Area SET Nombre_Area=?, Descripcion=? WHERE id_Area=?",
        [Nombre_Area, Descripcion||null, req.params.id]
      );
      res.json({ mensaje: "Área actualizada" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al actualizar área" });
    }
  });

  router.delete("/areas/:id", async (req, res) => {
    try {
      const db = await openDb();
      await db.execute("DELETE FROM Area WHERE id_Area=?", [req.params.id]);
      res.json({ mensaje: "Área eliminada" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar área" });
    }
  });

  // ========================= VENTAS =========================
  router.get("/ventas", async (req, res) => {
    try {
      const db = await openDb();
      const q = req.query.q ? `%${req.query.q}%` : "%";
      const [rows] = await db.execute(
        `SELECT v.*, c.Nombre_Cliente, e.Nombre_Empleado, p.Nombre_producto
         FROM Venta v
         LEFT JOIN Cliente  c ON v.id_Cliente  = c.id_Cliente
         LEFT JOIN Empleado e ON v.id_Empleado = e.Id_Empleado
         LEFT JOIN Producto p ON v.id_Producto = p.id
         WHERE (COALESCE(c.Nombre_Cliente,'') LIKE ? OR COALESCE(p.Nombre_producto,'') LIKE ?)
         ORDER BY v.id_Venta DESC`,
        [q, q]
      );
      res.json({ data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener ventas" });
    }
  });

  // PBI-012: verificar que el producto esté activo y tenga stock antes de vender
  router.post("/ventas", async (req, res) => {
    try {
      const db = await openDb();
      const { id_Cliente, id_Empleado, id_Producto, cantidad, fecha, total } = req.body;
      if (!id_Producto)
        return res.status(400).json({ error: "id_Producto es obligatorio" });

      // Verificar que el producto exista, esté activo y tenga stock
      const [[prod]] = await db.execute(
        "SELECT activo, Cantidad_producto, Nombre_producto FROM Producto WHERE id = ?",
        [id_Producto]
      );
      if (!prod)
        return res.status(404).json({ error: "Producto no encontrado" });
      if (!prod.activo)
        return res.status(409).json({ error: `El producto '${prod.Nombre_producto}' está inactivo y no se puede vender` });
      if (prod.Cantidad_producto < (cantidad || 1))
        return res.status(409).json({ error: `Stock insuficiente. Disponible: ${prod.Cantidad_producto}` });

      await db.execute(
        "INSERT INTO Venta (id_Cliente, id_Empleado, id_Producto, cantidad, fecha, total) VALUES (?, ?, ?, ?, ?, ?)",
        [id_Cliente||null, id_Empleado||null, id_Producto, cantidad||1, fecha||null, total||0]
      );
      res.json({ mensaje: "Venta registrada" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al registrar venta" });
    }
  });

  router.put("/ventas/:id", async (req, res) => {
    try {
      const db = await openDb();
      const { id_Cliente, id_Empleado, id_Producto, cantidad, fecha, total } = req.body;
      await db.execute(
        "UPDATE Venta SET id_Cliente=?, id_Empleado=?, id_Producto=?, cantidad=?, fecha=?, total=? WHERE id_Venta=?",
        [id_Cliente||null, id_Empleado||null, id_Producto, cantidad||1, fecha||null, total||0, req.params.id]
      );
      res.json({ mensaje: "Venta actualizada" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al actualizar venta" });
    }
  });

  router.delete("/ventas/:id", async (req, res) => {
    try {
      const db = await openDb();
      await db.execute("DELETE FROM Venta WHERE id_Venta=?", [req.params.id]);
      res.json({ mensaje: "Venta eliminada" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar venta" });
    }
  });

  // ========================= CODIGOS DE BARRAS =========================
  router.get("/codigos", async (req, res) => {
    try {
      const db = await openDb();
      const q = req.query.q ? `%${req.query.q}%` : "%";
      const [rows] = await db.execute(
        `SELECT cb.*, p.Nombre_producto
         FROM Codigo_Barras cb
         LEFT JOIN Producto p ON cb.id_producto = p.id
         WHERE cb.codigo_barras LIKE ? OR COALESCE(p.Nombre_producto,'') LIKE ?
         ORDER BY cb.id_codigo DESC`,
        [q, q]
      );
      res.json({ data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener códigos" });
    }
  });

  router.post("/codigos", async (req, res) => {
    try {
      const db = await openDb();
      const { id_producto, codigo_barras } = req.body;
      if (!id_producto || !codigo_barras)
        return res.status(400).json({ error: "id_producto y codigo_barras son obligatorios" });

      const codigoLimpio = codigo_barras.trim();
      if (!codigoLimpio)
        return res.status(400).json({ error: "El código no puede estar vacío" });
      if (codigoLimpio.length < 3 || codigoLimpio.length > 50)
        return res.status(400).json({ error: "El código debe tener entre 3 y 50 caracteres" });
      if (!/^[a-zA-Z0-9\-_]+$/.test(codigoLimpio))
        return res.status(400).json({ error: "El código solo puede contener letras, números, guiones y guiones bajos" });

      const [existe] = await db.execute(
        "SELECT id_codigo FROM Codigo_Barras WHERE codigo_barras = ?",
        [codigoLimpio]
      );
      if (existe.length)
        return res.status(409).json({ error: "Ese código de barras ya está registrado" });

      await db.execute(
        "INSERT INTO Codigo_Barras (id_producto, codigo_barras) VALUES (?, ?)",
        [id_producto, codigoLimpio]
      );
      res.json({ mensaje: "Código de barras registrado" });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY")
        return res.status(409).json({ error: "Ese código de barras ya existe" });
      console.error(err);
      res.status(500).json({ error: "Error al registrar código" });
    }
  });

  router.put("/codigos/:id", async (req, res) => {
    try {
      const db = await openDb();
      const { id_producto, codigo_barras } = req.body;
      await db.execute(
        "UPDATE Codigo_Barras SET id_producto=?, codigo_barras=? WHERE id_codigo=?",
        [id_producto, codigo_barras, req.params.id]
      );
      res.json({ mensaje: "Código actualizado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al actualizar código" });
    }
  });

  router.delete("/codigos/:id", async (req, res) => {
    try {
      const db = await openDb();
      await db.execute("DELETE FROM Codigo_Barras WHERE id_codigo=?", [req.params.id]);
      res.json({ mensaje: "Código eliminado" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar código" });
    }
  });

  // ========================= CATEGORÍAS (PBI-011) =========================
  router.get("/categorias", async (req, res) => {
    try {
      const db = await openDb();
      const soloActivas = req.query.todas !== "1";
      const filtro = soloActivas ? "WHERE activo = 1" : "";
      const [rows] = await db.execute(
        `SELECT * FROM Categoria ${filtro} ORDER BY Nombre_Categoria`
      );
      res.json({ data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al obtener categorías" });
    }
  });

  router.post("/categorias", async (req, res) => {
    try {
      const db = await openDb();
      const { Nombre_Categoria } = req.body;
      if (!Nombre_Categoria)
        return res.status(400).json({ error: "El nombre es obligatorio" });

      const [existe] = await db.execute(
        "SELECT id_categoria FROM Categoria WHERE Nombre_Categoria = ?",
        [Nombre_Categoria.trim()]
      );
      if (existe.length)
        return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });

      const [result] = await db.execute(
        "INSERT INTO Categoria (Nombre_Categoria, activo) VALUES (?, 1)",
        [Nombre_Categoria.trim()]
      );
      res.status(201).json({ mensaje: "Categoría creada", data: { id_categoria: result.insertId } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al crear categoría" });
    }
  });

  router.put("/categorias/:id", async (req, res) => {
    try {
      const db = await openDb();
      const { Nombre_Categoria } = req.body;
      if (!Nombre_Categoria)
        return res.status(400).json({ error: "El nombre es obligatorio" });

      const [existe] = await db.execute(
        "SELECT id_categoria FROM Categoria WHERE Nombre_Categoria = ? AND id_categoria != ?",
        [Nombre_Categoria.trim(), req.params.id]
      );
      if (existe.length)
        return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });

      await db.execute(
        "UPDATE Categoria SET Nombre_Categoria = ? WHERE id_categoria = ?",
        [Nombre_Categoria.trim(), req.params.id]
      );
      res.json({ mensaje: "Categoría actualizada" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al actualizar categoría" });
    }
  });

  // PBI-012: inactivar categoría sin borrar productos asociados
  router.patch("/categorias/:id/activo", async (req, res) => {
    try {
      const db = await openDb();
      const { activo } = req.body;
      await db.execute(
        "UPDATE Categoria SET activo = ? WHERE id_categoria = ?",
        [activo ? 1 : 0, req.params.id]
      );
      res.json({ mensaje: activo ? "Categoría activada" : "Categoría inactivada" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al cambiar estado" });
    }
  });

  router.post("/productos/:id/categorias", async (req, res) => {
    try {
      const db = await openDb();
      const { id_categoria } = req.body;
      if (!id_categoria)
        return res.status(400).json({ error: "id_categoria es obligatorio" });

      const [existe] = await db.execute(
        "SELECT * FROM Producto_Categoria WHERE id_producto = ? AND id_categoria = ?",
        [req.params.id, id_categoria]
      );
      if (existe.length)
        return res.status(409).json({ error: "El producto ya tiene esa categoría asignada" });

      await db.execute(
        "INSERT INTO Producto_Categoria (id_producto, id_categoria) VALUES (?, ?)",
        [req.params.id, id_categoria]
      );
      res.status(201).json({ mensaje: "Categoría asignada al producto" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al asignar categoría" });
    }
  });

  router.delete("/productos/:id/categorias/:id_categoria", async (req, res) => {
    try {
      const db = await openDb();
      await db.execute(
        "DELETE FROM Producto_Categoria WHERE id_producto = ? AND id_categoria = ?",
        [req.params.id, req.params.id_categoria]
      );
      res.json({ mensaje: "Categoría removida del producto" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al remover categoría" });
    }
  });

  return router;
}

module.exports = { apiRouter };