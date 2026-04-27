const mysql = require("mysql2/promise");

let connection;

async function openDb() {
  if (!connection) {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log("✅ Conectado a MySQL");
  }

  return connection;
}

module.exports = { openDb };