// server.js
require("dotenv").config();
const https = require("https");  // ← cambiar de http a https
const fs = require("fs");
const { createApp } = require("./backend/src/app");

const app = createApp();

const opciones = {
  key: fs.readFileSync("./certs/key.pem"),
  cert: fs.readFileSync("./certs/cert.pem"),
};

https.createServer(opciones, app).listen(3000, () => {
  console.log("Servidor corriendo en https://localhost:3000");
});