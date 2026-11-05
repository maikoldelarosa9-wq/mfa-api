const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_FILE = path.join(__dirname, 'database.json');

function loadDatabase() {
    if (fs.existsSync(DB_FILE)) {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error("Error leyendo database.json, usando valores por defecto.");
        }
    }
    return {
        keys: [
            { key: 'MFA-KEY-9981', used: false, fileUrl: 'https://mega.nz/archivo-ejemplo-1', discordUser: 'Ninguno', exhausted: false },
            { key: 'MFA-KEY-1234', used: false, fileUrl: 'https://mega.nz/archivo-ejemplo-2', discordUser: 'Ninguno', exhausted: false },
            { key: 'MFA-KEY-5678', used: true, fileUrl: 'https://mega.nz/archivo-ejemplo-3', discordUser: 'Usuario#1234', exhausted: false }
        ],
        bannedUsers: ['UsuarioTraficante#0000']
    };
}

function saveDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

let db = loadDatabase();
const ADMIN_PASSWORD = ".gg";
let activeAdmins = new Set();

app.get('/', (req, res) => {
    const clientIp = req.ip;
    const isAdmin = activeAdmins.has(clientIp);
    const userKey = req.query.key;
    const discordUser = req.query.user;

    // Si es administrador, mostrar el panel de administración
    if (isAdmin) {
        return renderAdminPanel(req, res);
    }

    // Si el usuario ingresó una key, validarla
    if (userKey) {
        if (db.bannedUsers.includes(discordUser)) {
            return res.send(renderAuthPage("Tu usuario de Discord está baneado del sistema."));
        }

        const foundKey = db.keys.find(k => k.key === userKey);

        if (!foundKey) {
            return res.send(renderAuthPage("La clave ingresada no existe."));
        }

        if (foundKey.exhausted) {
            return res.send(renderAuthPage("Esta clave ha sido marcada como agotada."));
        }

        if (foundKey.used && foundKey.discordUser !== discordUser) {
            return res.send(renderAuthPage("Esta clave ya fue utilizada por otro usuario."));
        }

        if (!foundKey.used) {
            foundKey.used = true;
            foundKey.discordUser = discordUser || 'Usuario#0000';
            saveDatabase(db);
        }

        // Si la key es válida, mostrar el acceso al archivo descargable
        return res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>.gg — Acceso Concedido</title>
                <style>
                    body { background: #000; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .card { background: #0a0a0c; border: 1px solid #1a1a1e; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px; width: 100%; }
                    .btn { background: #34c759; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>¡Key Verificada!</h2>
                    <p style="color: #888; font-size: 13px; margin: 10px 0;">Tu acceso ha sido validado correctamente.</p>
                    <a href="${foundKey.fileUrl}" target="_blank" class="btn">Descargar Archivo</a>
                </div>
            </body>
            </html>
        `);
    }

    // Si no hay key ni admin, mostrar pantalla obligatoria de autenticación/key
    return res.send(renderAuthPage());
});

function renderAuthPage(errorMessage = "") {
    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>.gg — Autenticación</title>
            <style>
                :root { --bg: #000000; --card: #0a0a0c; --border: #1a1a1e; }
                * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                body { background: var(--bg); color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .box { background: var(--card); border: 1px solid var(--border); padding: 30px; border-radius: 14px; width: 100%; max-width: 380px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
                h2 { font-size: 18px; margin-bottom: 5px; font-weight: 700; }
                p { font-size: 12px; color: #888; margin-bottom: 20px; }
                input { width: 100%; background: #000; border: 1px solid var(--border); color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; outline: none; }
                input:focus { border-color: #444; }
                button { width: 100%; background: #fff; color: #000; border: none; padding: 10px; border-radius: 8px; font-weight