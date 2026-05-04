const express = require("express");
const morgan = require("morgan");
const path = require("path");

// NUEVO: rutas modulares
const routes = require("./routes");

const { apiRouter } = require("./api");

const { notFound, errorHandler } = require("./errors");

function createApp() {
  const app = express();

  // Middlewares
  app.use(morgan("dev"));
  app.use(express.json());

  // ========================= API =========================

  // NUEVO (arquitectura modular PBI-001)
  app.use("/api", routes);

  // TEMPORAL (por compatibilidad con código actual)
  // Eliminarlo cuando es migre todo a /modules
  app.use("/api", apiRouter());

  // ========================= FRONTEND =========================
  app.use(express.static(path.join(__dirname, "../../public")));

  // ========================= ERRORES =========================
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };