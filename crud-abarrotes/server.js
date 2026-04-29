// server.js
require("dotenv").config();
const fs = require("fs");
const https = require("https");
const { createApp } = require("./src/app");

const app = createApp();

const options = {
    key:  fs.readFileSync("certs/key.pem"),
    cert: fs.readFileSync("certs/cert.pem"),
};

https.createServer(options, app).listen(process.env.PORT || 3000, () => {
    console.log("🚀 Servidor HTTPS corriendo en puerto 3000");
});