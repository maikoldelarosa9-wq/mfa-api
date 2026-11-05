const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base de datos simulada en memoria (puedes modificar/agregar tus claves y archivos)
let keysDatabase = [
    { key: 'MFA-KEY-9981', used: false, fileUrl: 'https://mega.nz/archivo-ejemplo-1', discordUser: 'Ninguno' },
    { key: 'MFA-KEY-1234', used: false, fileUrl: 'https://mega.nz/archivo-ejemplo-2', discordUser: 'Ninguno' },
    { key: 'MFA-KEY-5678', used: true, fileUrl: 'https://mega.nz/archivo-ejemplo-3', discordUser: 'Usuario#1234' }
];

// 1. Panel Web Completo y Moderno (Estilo Portal de Distribución)
app.get('/', (req, res) => {
    let totalKeys = keysDatabase.length;
    let usedKeys = keysDatabase.filter(k => k.used).length;
    let availableKeys = totalKeys - usedKeys;

    let rows = keysDatabase.map(item => `
        <tr>
            <td style="padding: 14px; border-bottom: 1px solid #2f2f2f; font-family: monospace; color: #339af0; font-weight: bold;">${item.key}</td>
            <td style="padding: 14px; border-bottom: 1px solid #2f2f2f;">
                <span style="background: ${item.used ? 'rgba(255, 107, 107, 0.15)' : 'rgba(81, 207, 102, 0.15)'}; color: ${item.used ? '#ff6b6b' : '#51cf66'}; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold;">
                    ${item.used ? '● Utilizada' : '● Disponible'}
                </span>
            </td>
            <td style="padding: 14px; border-bottom: 1px solid #2f2f2f; color: #a0a0a0;">${item.discordUser}</td>
            <td style="padding: 14px; border-bottom: 1px solid #2f2f2f; max-width: 220px; overflow: hidden; text-overflow: ellipsis;">
                <a href="${item.fileUrl}" target="_blank" style="color: #748ffc; text-decoration: none;">${item.fileUrl}</a>
            </td>
        </tr>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Panel Oficial - MFA API & Licencias</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { background-color: #0f1117; color: #e1e1e6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; padding: 40px 20px; }
                .container { width: 100%; max-width: 900px; background: #161821; padding: 30px; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); border: 1px solid #262938; }
                header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #262938; padding-bottom: 20px; margin-bottom: 25px; }
                h1 { font-size: 22px; color: #fff; font-weight: 700; }
                .status-badge { background: rgba(51, 154, 240, 0.15); color: #339af0; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
                .status-badge::before { content: ''; width: 8px; height: 8px; background: #339af0; border-radius: 50%; display: inline-block; }
                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
                .stat-card { background: #1e2029; padding: 18px; border-radius: 12px; border: 1px solid #2a2d3d; }
                .stat-card h3 { font-size: 13px; color: #8b949e; margin-bottom: 6px; }
                .stat-card p { font-size: 20px; font-weight: bold; color: #fff; }
                h3.section-title { font-size: 16px; color: #c9d1d9; margin-bottom: 15px; }
                .table-container { overflow-x: auto; background: #191b24; border-radius: 10px; border: 1px solid #262938; }
                table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
                th { background-color: #1f222e; padding: 14px; color: #8b949e; font-weight: 600; border-bottom: 1px solid #262938; }
            </style>
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>MFA API — Gestión de Licencias</h1>
                    <div class="status-badge">Sistema En Línea</div>
                </header>

                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Total de Claves</h3>
                        <p>${totalKeys}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Disponibles</h3>
                        <p style="color: #51cf66;">${availableKeys}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Canjeadas</h3>
                        <p style="color: #ff6b6b;">${usedKeys}</p>
                    </div>
                </div>

                <h3 class="section-title">Registro de Claves Activas</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Clave</th>
                                <th>Estado</th>
                                <th>Usuario Discord</th>
                                <th>Enlace de Archivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        </body>
        </html>
    `);
});

// 2. Endpoint que consume el bot de Discord para redimir claves
app.get('/getkey', (req, res) => {
    const userKey = req.query.key;
    const discordUser = req.query.user || 'Usuario de Discord';

    if (!userKey) {
        return res.json({ valid: false, message: 'No se proporcionó ninguna clave.' });
    }

    const foundKey = keysDatabase.find(k => k.key === userKey);

    if (!foundKey) {
        return res.json({ valid: false, message: 'La clave ingresada no existe.' });
    }

    if (foundKey.used) {
        return res.json({ valid: false, message: 'Esta clave ya fue utilizada anteriormente.' });
    }

    // Marcar como usada y registrar quién la redimió
    foundKey.used = true;
    foundKey.discordUser = discordUser;

    return res.json({
        valid: true,
        fileUrl: foundKey.fileUrl,
        message: '¡Clave canjeada con éxito!'
    });
});

app.listen(PORT, () => {
    console.log(`Servidor web y API corriendo en el puerto ${PORT}`);
});