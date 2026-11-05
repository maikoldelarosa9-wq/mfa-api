const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔑 Base de datos de tus claves
const keysDatabase = {
    "MFA-KEY-9981": { active: true, fileUrl: "https://tu-enlace-de-archivo.com/archivo1.zip" },
    "MFA-KEY-1234": { active: true, fileUrl: "https://tu-enlace-de-archivo.com/archivo2.zip" }
};

app.get('/', (req, res) => {
    res.json({
        status: "online",
        service: "MFA Key System",
        version: "1.0.0"
    });
});

app.get('/getkey', (req, res) => {
    const key = req.query.key;

    if (!key || !keysDatabase[key]) {
        return res.status(404).json({
            valid: false,
            message: "La clave ingresada no es válida o no existe."
        });
    }

    const keyData = keysDatabase[key];

    if (!keyData.active) {
        return res.status(400).json({
            valid: false,
            message: "Esta clave ya fue canjeada anteriormente y expiró."
        });
    }

    keyData.active = false;

    res.json({
        valid: true,
        fileUrl: keyData.fileUrl
    });
});

app.listen(PORT, () => {
    console.log(`Servidor MFA corriendo en puerto ${PORT}`);
});