const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const DB_FILE = path.join(__dirname, 'database.json');
const HTML_FILE = path.join(__dirname, 'index.html');
const ADMIN_PASSWORD = '.gg';
const activeAdmins = new Set();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function defaultDatabase() {
    return {
        keys: [
            { key: 'MFA-KEY-9981', used: false, fileUrl: 'https://mega.nz/archivo-ejemplo-1', discordUser: 'Ninguno', exhausted: false },
            { key: 'MFA-KEY-1234', used: false, fileUrl: 'https://mega.nz/archivo-ejemplo-2', discordUser: 'Ninguno', exhausted: false },
            { key: 'MFA-KEY-5678', used: true, fileUrl: 'https://mega.nz/archivo-ejemplo-3', discordUser: 'Usuario#1234', exhausted: false }
        ],
        bannedUsers: ['UsuarioTraficante#0000']
    };
}

function loadDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        return defaultDatabase();
    }

    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (!data || !Array.isArray(data.keys) || !Array.isArray(data.bannedUsers)) {
            throw new Error('Formato de database.json no válido.');
        }
        return data;
    } catch (error) {
        console.error('Error leyendo database.json; se usarán valores por defecto:', error.message);
        return defaultDatabase();
    }
}

function saveDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}

function safeFileLink(value) {
    const url = String(value || '');
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
            return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="url-link">${escapeHtml(url)}</a>`;
        }
    } catch (error) {
        // Show malformed URLs as text rather than creating a broken link.
    }
    return escapeHtml(url);
}

function getClientIp(req) {
    return req.ip || req.socket.remoteAddress;
}

function isAdmin(req) {
    return activeAdmins.has(getClientIp(req));
}

function requireAdmin(req, res, next) {
    if (!isAdmin(req)) {
        return res.redirect('/');
    }
    next();
}

let db = loadDatabase();

app.get('/', (req, res) => {
    if (!fs.existsSync(HTML_FILE)) {
        return res.status(500).send('Error crítico: Falta el archivo index.html en el servidor.');
    }

    fs.readFile(HTML_FILE, 'utf8', (error, template) => {
        if (error) {
            console.error('Error al leer index.html:', error);
            return res.status(500).send('Error al leer la interfaz web.');
        }

        const admin = isAdmin(req);
        const totalKeys = db.keys.length;
        const usedKeys = db.keys.filter(item => item.used).length;
        const exhaustedKeys = db.keys.filter(item => item.exhausted).length;
        const availableKeys = db.keys.filter(item => !item.used && !item.exhausted).length;

        const rows = db.keys.map((item, index) => {
            const statusBadge = item.exhausted
                ? '<span class="badge badge-exhausted">⚪ Agotada</span>'
                : item.used
                    ? '<span class="badge badge-used">🔴 Utilizada</span>'
                    : '<span class="badge badge-active">🟢 Disponible</span>';
            const adminActions = admin ? `
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
                </td>` : '';

            return `<tr>
                <td class="font-mono">${escapeHtml(item.key)}</td>
                <td>${statusBadge}</td>
                <td style="color: #bbb;">${escapeHtml(item.discordUser || 'Ninguno')}</td>
                <td>${safeFileLink(item.fileUrl)}</td>
                ${adminActions}
            </tr>`;
        }).join('');

        const adminLoginSection = admin
            ? `<form action="/admin/logout" method="POST">
                   <button class="btn btn-danger btn-sm">Cerrar Sesión</button>
               </form>`
            : `<form action="/admin/login" method="POST" style="display:flex; gap:8px;">
                   <input type="password" name="password" class="admin-input" placeholder="Clave admin" required>
                   <button class="btn btn-sm">Acceder</button>
               </form>`;

        const adminPanelSection = admin ? `
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
                <p style="font-size: 12px; color: #888; margin-top: 10px;">Usuarios baneados: ${db.bannedUsers.map(escapeHtml).join(', ') || 'Ninguno'}</p>
            </div>` : '';

        const values = {
            adminLoginSection,
            totalKeys,
            availableKeys,
            usedKeys,
            exhaustedKeys,
            adminPanelSection,
            adminHeaderAction: admin ? '<th>Acciones</th>' : '',
            rows
        };
        const html = template.replace(/\{\{\{(\w+)\}\}\}|\{\{(\w+)\}\}/g, (match, rawKey, escapedKey) => {
            const key = rawKey || escapedKey;
            return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
        });

        res.send(html);
    });
});

app.post('/admin/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        activeAdmins.add(getClientIp(req));
    }
    res.redirect('/');
});

app.post('/admin/logout', requireAdmin, (req, res) => {
    activeAdmins.delete(getClientIp(req));
    res.redirect('/');
});

app.post('/admin/toggle-exhausted', requireAdmin, (req, res) => {
    const index = Number.parseInt(req.body.index, 10);
    if (Number.isInteger(index) && index >= 0 && index < db.keys.length) {
        db.keys[index].exhausted = !db.keys[index].exhausted;
        saveDatabase(db);
    }
    res.redirect('/');
});

app.post('/admin/add-key', requireAdmin, (req, res) => {
    const { key, fileUrl } = req.body;
    if (typeof key === 'string' && key.trim() && typeof fileUrl === 'string' && fileUrl.trim()) {
        db.keys.push({
            key: key.trim(),
            used: false,
            fileUrl: fileUrl.trim(),
            discordUser: 'Ninguno',
            exhausted: false
        });
        saveDatabase(db);
    }
    res.redirect('/');
});

app.post('/admin/delete-key', requireAdmin, (req, res) => {
    const index = Number.parseInt(req.body.index, 10);
    if (Number.isInteger(index) && index >= 0 && index < db.keys.length) {
        db.keys.splice(index, 1);
        saveDatabase(db);
    }
    res.redirect('/');
});

app.post('/admin/delete-by-name', requireAdmin, (req, res) => {
    const { keyName } = req.body;
    if (typeof keyName === 'string') {
        db.keys = db.keys.filter(item => item.key !== keyName);
        saveDatabase(db);
    }
    res.redirect('/');
});

app.post('/admin/ban-user', requireAdmin, (req, res) => {
    const { discordUser } = req.body;
    if (typeof discordUser === 'string' && discordUser.trim() && !db.bannedUsers.includes(discordUser.trim())) {
        db.bannedUsers.push(discordUser.trim());
        saveDatabase(db);
    }
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}.`);
});
