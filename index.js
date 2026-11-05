const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para leer datos en formato JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base de datos en memoria (puedes agregar las claves que quieras)
let keysDatabase = [
    { key: 'MFA-KEY-9981', used: false, fileUrl: 'https://mega.nz/ejemplo-archivo-1' },
    { key: 'MFA-KEY-1234', used: false, fileUrl: 'https://mega.nz/ejemplo-archivo-2' },
    { key: 'MFA-KEY-5678', used: true, fileUrl: 'https://mega.nz/ejemplo-archivo-3' }
];

// 1. Página Web Principal (Panel visual para ver el estado de las claves)
app.get('/', (req, res) => {
    let rows = keysDatabase.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #444; font-family: monospace;">${item.key}</td>
            <td style="padding: 10px; border-bottom: 1px solid #444;">
                <span style="color: ${item.used ? '#ff6b6b' : '#51cf66'}; font-weight: bold;">
                    ${item.used ? '🔴 Utilizada' : '🟢 Disponible'}
                </span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #444; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                <a href="${item.fileUrl}" target="_blank" style="color: #339af0;">${item.fileUrl}</a>
            </td>
        </tr>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Panel MFA API</title>
            <style>
                body { background-color: #121212; color: #e0e0e0; font-family: sans-serif; display: flex; justify-content: center; padding-top: 50px; }
                .container { width: 800px; background: #1e1e1e; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.7); }
                h1 { color: #fff; border-bottom: 2px solid #333; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #2c2c2c; padding: 12px; text-align: left; color: #aaa; }
                .badge { background: #2f9e44; color: white; padding: 6px 12px; border-radius: 4px; display: inline-block; margin-bottom: 20px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Panel de Control - MFA API</h1>
                <div class="badge">Estado del Servidor: En Línea (Online)</div>
                <h3>Claves de Licencia Registradas</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Clave</th>
                            <th>Estado</th>
                            <th>Enlace de Archivo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
    `);
});

// 2. Endpoint que usará el Bot de Discord para verificar y redimir la clave
app.get('/getkey', (req, res) => {
    const userKey = req.query.key;

    if (!userKey) {
        return res.json({ valid: false, message: 'No se proporcionó ninguna clave.' });
    }

    // Buscamos la clave en la base de datos
    const foundKey = keysDatabase.find(k => k.key === userKey);

    if (!foundKey) {
        return res.json({ valid: false, message: 'La clave no existe.' });
    }

    if (foundKey.used) {
        return res.json({ valid: false, message: 'La clave ya fue utilizada anteriormente.' });
    }

    // Si es válida y no se ha usado, la marcamos como usada
    foundKey.used = true;

    return res.json({
        valid: true,
        fileUrl: foundKey.fileUrl,
        message: 'Clave canjeada con éxito.'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});