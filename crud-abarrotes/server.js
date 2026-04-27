    require("dotenv").config();
    const { createApp } = require("./src/app");

    const app = createApp();

    app.listen(process.env.PORT || 3000, () => {
    console.log("🚀 Servidor corriendo en puerto 3000");
    });