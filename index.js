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
    const clientIp = req.ip || req.connection.remoteAddress;
    const isAdmin = activeAdmins.has(clientIp);
    
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

        let adminActions = isAdmin ? `
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
        ` : '';

        return `
            <tr>
                <td class="font-mono">${item.key}</td>
                <td>${statusBadge}</td>
                <td style="color: #bbb;">${item.discordUser}</td>
                <td><a href="${item.fileUrl}" target="_blank" class="url-link">${item.fileUrl}</a></td>
                ${adminActions}
            </tr>
        `;
    }).join('');

    let adminLoginSection = isAdmin ? `
        <form action="/admin/logout" method="POST">
            <button class="btn btn-danger btn-sm">Cerrar Sesión</button>
        </form>
    ` : `
        <form action="/admin/login" method="POST" style="display:flex; gap:8px;">
            <input type="password" name="password" class="admin-input" placeholder="Clave admin" required>
            <button class="btn btn-sm">Acceder</button>
        </form>
    `;

    let adminPanelSection = isAdmin ? `
        <div class="admin-nav-banner">
            <div>
                <strong style="color: #fff; font-size: 14px;">⚙️ Menú de Administración .gg</strong>
                <p style="font-size: 12px; color: #888; margin-top: 2px;">Control total de licencias y moderación de usuarios.</p>
            </div>
            <span style="background: rgba(52, 199, 89, 0.15); color: #34c759; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold;">Sesión Segura</span>
        </div>

        <div class="panel-box">
            <div class="panel-title">➕ Generar Nueva Key</div>
            <form action="/admin/add-key" method="POST" style="display:flex; gap:10px; flex-wrap: wrap;">
                <input type="text" name="key" placeholder="Ej: .GG-KEY-2026" required style="flex:1;">
                <input type="text" name="fileUrl" placeholder="Link de descarga (MEGA/Mediafire)" required style="flex:2;">
                <button class="btn btn-success">Añadir Clave</button>
            </form>
        </div>

        <div class="panel-box">
            <div class="panel-title">🗑️ Eliminar Key por Nombre</div>
            <form action="/admin/delete-by-name" method="POST" style="display:flex; gap:10px;">
                <input type="text" name="keyName" placeholder="Ej: MFA-KEY-9981" required style="flex:1;">
                <button class="btn" style="background: #111; color: #ff3b30; border: 1px solid #ff3b30;">Eliminar Key</button>
            </form>
        </div>

        <div class="panel-box">
            <div class="panel-title">🚫 Banear Usuario de Discord</div>
            <form action="/admin/ban-user" method="POST" style="display:flex; gap:10px;">
                <input type="text" name="discordUser" placeholder="Usuario#0000" required style="flex:1;">
                <button class="btn btn-danger">Banear Usuario</button>
            </form>
            <p style="font-size: 12px; color: #888; margin-top: 10px;">Usuarios baneados: ${db.bannedUsers.join(', ') || 'Ninguno'}</p>
        </div>
    ` : '';

    let adminHeaderAction = isAdmin ? '<th>Acciones</th>' : '';

    const htmlPath = path.join(__dirname, 'index.html');
    if (!fs.existsSync(htmlPath)) {
        return res.status(500).send('Error crítico: Falta el archivo index.html en el servidor.');
    }

    fs.readFile(htmlPath, 'utf8', (err, htmlTemplate) => {
        if (err) return res.status(500).send('Error al leer la interfaz web.');

        let finalHtml = htmlTemplate
            .replace('{{{adminLoginSection}}}', adminLoginSection)
            .replace('{{totalKeys}}', totalKeys)
            .replace('{{availableKeys}}', availableKeys)
            .replace('{{usedKeys}}', usedKeys)
            .replace('{{exhaustedKeys}}', exhaustedKeys)
            .replace('{{{adminPanelSection}}}', adminPanelSection)
            .replace('{{{adminHeaderAction}}}', adminHeaderAction)
            .replace('{{{rows}}}', rows);

        res.send(finalHtml);
    });
});

app.post('/admin/login', (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        activeAdmins.add(clientIp);
    }
    res.redirect('/');
});

app.post('/admin/logout', (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    activeAdmins.delete(clientIp);
    res.redirect('/');
});

app.post('/admin/toggle-exhausted', (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!activeAdmins.has(clientIp)) return res.redirect('/');
    const { index } = req.body;
    if (db.keys[index]) {
        db.keys[index].exhausted = !db.keys[index].exhausted;
        saveDatabase(db);
    }
    res.redirect('/');
});

app.post('/admin/add-key', (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!activeAdmins.has(clientIp)) return res.redirect('/');
    const { key, fileUrl } = req.body;
    if (key && fileUrl) {
        db.keys.push({ key, used: false, file