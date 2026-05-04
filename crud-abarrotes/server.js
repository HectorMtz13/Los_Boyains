require("dotenv").config();
const http = require("http");
const { createApp } = require("./backend/src/app");

const app = createApp();

http.createServer(app).listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});