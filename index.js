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

    // Si introduce la clave de admin en el campo general
    if (userKey === ADMIN_PASSWORD) {
        activeAdmins.add(clientIp);
        return res.redirect('/');
    }

    // Si ya es administrador activo, mostrar el panel
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

    // Pantalla de autenticación obligatoria
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
                input { width: 100%; background: #000000 !important; border: 1px solid var(--border); color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; outline: none; }
                input:focus { border-color: #444; }
                button { width: 100%; background: #fff; color: #000; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; }
                button:hover { opacity: 0.85; }
                .error { color: #ff3b30; font-size: 12px; margin-bottom: 12px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="box">
                <h2>Acceso a .gg</h2>
                <p>Introduce tu clave o clave de administrador para continuar.</p>
                ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
                <form action="/" method="GET">
                    <input type="text" name="key" placeholder="Introduce tu Key o Admin Pass (.gg)" required>
                    <input type="text" name="user" placeholder="Tu usuario de Discord (ej: Usuario#1234)">
                    <button type="submit">Ingresar</button>
                </form>
            </div>
        </body>
        </html>
    `;
}

function renderAdminPanel(req, res) {
    let totalKeys = db.keys.length;
    let usedKeys = db.keys.filter(k => k.used).length;
    let exhaustedKeys = db.keys.filter(k => k.exhausted).length;
    let availableKeys = totalKeys - usedKeys - exhaustedKeys;

    let rows = db.keys.map((item, index) => {
        let statusBadge = item.exhausted 
            ? '<span class="badge badge-exhausted">⚪ Agotada</span>' 
            : (item.used 
                ? '<span class="badge badge-used">🔴 Utilizada</span>' 
                : '<span class="badge badge-active">🟢 Disponible</span>');

        return `
            <tr>
                <td class="font-mono">${item.key}</td>
                <td>${statusBadge}</td>
                <td style="color: #bbb;">${item.discordUser}</td>
                <td><a href="${item.fileUrl}" target="_blank" class="url-link">${item.fileUrl}</a></td>
                <td style="padding: 14px; display: flex; gap: 6px; align-items: center;">
                    <form action="/admin/toggle-exhausted" method="POST" style="display:inline;">
                        <input type="hidden" name="index" value="${index}">
                        <button class="btn btn-sm" style="background: #222; color: #fff; border: 1px solid #444;">
                            ${item.exhausted ? 'Activar' : 'Agotar'}
                        </button>
                    </form>
                    <form action="/admin/delete-key" method="POST" style="display:inline;">
                        <input type="hidden" name="index" value="${index}">
                        <button class="btn btn-sm" style="background: #111; color: #ff3b30; border: 1px solid #ff3b30;">Eliminar</button>
                    </form>
                </td>
            </tr>
        `;
    }).join('');

    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, htmlTemplate) => {
        if (err) return res.status(500).send('Error al cargar la interfaz web.');

        let finalHtml = htmlTemplate
            .replace('{{{adminLoginSection}}}', `<form action="/admin/logout" method="POST"><button class="btn btn-danger btn-sm">Cerrar Sesión</button></form>`)
            .replace('{{totalKeys}}', totalKeys)
            .replace('{{availableKeys}}', availableKeys)
            .replace('{{usedKeys}}', usedKeys)
            .replace('{{exhaustedKeys}}', exhaustedKeys)
            .replace('{{{adminPanelSection}}}', `
                <div class="admin-nav-banner">
                    <div>
                        <strong style="color: #fff; font-size: 14px;">⚙️ Menú de Administración .gg</strong>
                        <p style="font-size: 12px; color: #888; margin-top: 2px;">Control total de licencias y moderación de usuarios.</p>
                    </div>
                    <span style="background: rgba(52, 199, 89, 0.15); color: #34c759; padding: 4px 10px; border-radius: 6px; font-size: 1