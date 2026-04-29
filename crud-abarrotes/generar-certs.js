const { execSync } = require("child_process");
const fs = require("fs");

if (!fs.existsSync("certs")) fs.mkdirSync("certs");

// Usa el openssl que viene con Git si está instalado
const posibles = [
  "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
  "C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe",
];

const openssl = posibles.find(p => fs.existsSync(p)) || "openssl";

execSync(
  `"${openssl}" req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"`,
  { stdio: "inherit" }
);

console.log("✅ Certificados generados en /certs");