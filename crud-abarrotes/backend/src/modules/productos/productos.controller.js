const model = require("./productos.model");

exports.getAll = async (req, res) => {
  try {
    const q          = req.query.q    || "";
    const soloActivos = req.query.todos !== "1";
    const data = await model.getAll(q, soloActivos);
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await model.getById(req.params.id);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res) => {
  try {
    const { Nombre_producto } = req.body;
    if (!Nombre_producto)
      return res.status(400).json({ error: "Nombre_producto es obligatorio" });
    const data = await model.create(req.body);
    res.status(201).json({ mensaje: "Producto creado", data });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const data = await model.update(req.params.id, req.body);
    res.json({ mensaje: "Producto actualizado", data });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res, next) => {
  try {
    await model.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// PBI-006
exports.getByBarcode = async (req, res) => {
  try {
    const producto = await model.getByCodigoBarras(req.params.codigo);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    res.json({ data: producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar por código" });
  }
};

// PBI-007
exports.createConCodigo = async (req, res) => {
  try {
    const { Nombre_producto, codigo_barras } = req.body;
    if (!Nombre_producto) return res.status(400).json({ error: "Nombre_producto es obligatorio" });
    if (!codigo_barras)   return res.status(400).json({ error: "codigo_barras es obligatorio" });
    const data = await model.createConCodigo(req.body);
    res.status(201).json({ mensaje: "Producto creado con código de barras", data });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Ese código de barras ya está registrado" });
    console.error(err);
    res.status(500).json({ error: "Error al crear producto" });
  }
};