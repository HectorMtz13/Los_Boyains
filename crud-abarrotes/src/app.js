const express = require("express");
const morgan = require("morgan");
const path = require("path");
const { apiRouter } = require("./api");
const { notFound, errorHandler } = require("./errors");

function createApp() {
  const app = express();

  app.use(morgan("dev"));
  app.use(express.json());

  app.use("/api", apiRouter());

  app.use(express.static(path.join(__dirname, "../public")));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };