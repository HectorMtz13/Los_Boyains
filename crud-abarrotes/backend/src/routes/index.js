const express = require("express");
const router = express.Router();

const productosRoutes = require("../modules/productos/productos.routes");

router.use("/productos", productosRoutes);

module.exports = router;