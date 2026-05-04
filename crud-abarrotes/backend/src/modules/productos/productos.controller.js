const model = require("./productos.model");

exports.getAll = async (req, res, next) => {
  try {
    const data = await model.getAll();
    res.json({ data });
  } catch (err) {
    next(err);
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

exports.create = async (req, res, next) => {
  try {
    const item = await model.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const item = await model.update(req.params.id, req.body);
    res.json(item);
  } catch (err) {
    next(err);
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