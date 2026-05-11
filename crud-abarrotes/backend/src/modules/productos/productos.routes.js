const express = require("express");
const router = express.Router();
const ctrl = require("./productos.controller");

router.get("/", ctrl.getAll);
router.get("/barcode/:codigo", ctrl.getByBarcode);
router.post("/con-codigo", ctrl.createConCodigo);
router.get("/:id", ctrl.getById);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;