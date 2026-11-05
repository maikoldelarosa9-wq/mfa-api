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
            console.error("Error leyendo database.json");
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
    const discordUser = req.query.user || 'Usuario#0000';

    if (userKey === ADMIN_PASSWORD) {
        activeAdmins.add(clientIp);
        return res.redirect('/');
    }

    if (isAdmin) {
        return renderPage(res, true, null, null);
    }

    if (userKey) {
        if (db.bannedUsers.includes(discordUser)) {
            return renderPage(res, false, "Tu usuario de Discord está baneado del sistema.", null);
        }

        const foundKey = db.keys.find(k => k.key === userKey);

        if (!foundKey) {
            return renderPage(res, false, "La clave ingresada no existe.", null);
        }

        if (foundKey.exhausted) {
            return renderPage(res, false, "Esta clave ha sido marcada como agotada.", null);
        }

        if (foundKey.used && foundKey.discordUser !== discordUser) {
            return renderPage(res, false, "Esta clave ya fue utilizada por otro usuario.", null);
        }

        if (!foundKey.used) {
            foundKey.used = true;
            foundKey.discordUser = discordUser;
            saveDatabase(db);
        }

        return renderPage(res, false, null, foundKey.fileUrl);
    }

    return renderPage(res, false, null, null);
});

function renderPage(res, isAdmin, errorMessage, unlockedUrl) {
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, htmlTemplate) => {
        if (err) return res.status(500).send('Error al cargar la interfaz.');

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

        let contentSection = '';

        if (isAdmin) {
            contentSection = `
                <div class="stats-grid">
                    <div class="stat-card"><h3>Total Keys</h3><p>${totalKeys}</p></div>
                    <div class="stat-card"><h3>Disponibles</h3><p style="color: #34c759;">${availableKeys}</p></div>
                    <div class="stat-card"><h3>Canjeadas</h3><p style="color: #ff3b30;">${usedKeys}</p></div>
                    <div class="stat-card"><h3>Agotadas</h3><p style="color: #aeaeb2;">${exhaustedKeys}</p></div>
                </div>

                <div class="admin-nav-banner">
                    <div>
                        <strong style="color: #fff; font-size: 14px;">⚙️ Menú de Administración .gg</strong>
                        <p style="font-size: 12px; color: #888; margin-top: 2px;">Control total de licencias y moderación de usuarios.</p>
                    </div>
                    <form action="/admin/logout" method="POST" style="margin:0;">
                        <button class="btn btn-danger btn-sm">Cerrar Sesión</button>
                    </form>
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

                <div class="panel-box">
                    <div class="panel-title">Registro Oficial de Licencias</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Clave</th>
                                <th>Estado</th>
                                <th>Usuario Discord</th>
                                <th>Enlace de Archivo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `;
        } else if (unlockedUrl) {
            contentSection = `
                <div class="auth-card" style="text-align: center;">
                    <h2 style="font-size: 20px; margin-bottom: 10px; color: #34c759;">¡Key Verificada con Éxito!</h2>
                    <p style="color: #888; font-size: 13px; margin-bottom: 20px;">Tu acceso al contenido ha sido concedido.</p>
                    <a href="${unlockedUrl}" target="_blank" class="btn" style="display: inline-block; text-decoration: none; background: #fff; color: #000; padding: 12px 24px; font-weight: bold; border-radius: 8px;">Descargar Archivo</a>
                    <div style="margin-top: 20px;">
                        <a href="/" style="color: #888; font-size: 12px; text-decoration: none;">← Volver al inicio</a>
                    </div>
                </div>
            `;
        } else {
            contentSection = `
                <div class="auth-card">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 6px;">Acceso a .gg</h2>
                        <p style="color: #888; font-size: 12px;">Introduce tu key para desbloquear el contenido.</p>
                    </div>
                    ${errorMessage ? `<div style="background: rgba(255,59,48,0.1); color: #ff3b30; border: 1px solid rgba(255,59,48,0.2); padding: 10px; border-radius: 8px; font-size: 12px; margin-bottom: 15px; text-align: center;">${errorMessage}</div>` : ''}
                    <form action="/" method="GET" style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label style="display: block; font-size: 11px; color: #888; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Clave de Acceso</label>
                            <input type="text" name="key" placeholder="Ej: MFA-KEY-9981" required style="width: 100%;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 11px; color: #888; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Usuario de Discord</label>
                            <input type="text" name="user" placeholder="Ej: Usuario#1234" required style="width: 100%;">
                        </div>
                        <button type="submit" class="btn" style="width: 100%; margin-top: 5px; background: #fff; color: #000; padding: 10px; font-weight: bold; border-radius: 8px; border: none; cursor: pointer;">Verificar Key</button>
                    </form>
                </div>
            `;
        }

        let finalHtml = htmlTemplate.replace('{{{content}}}', contentSection);
        res.send(finalHtml);
    });
}

app.post('/admin/logout', (req, res) => {
    activeAdmins.delete(req.ip);
    res.redirect('/');
});

app.post('/admin/toggle-exhausted', (req, res) => {
    if (!activeAdmins.has(req.ip)) return res.redirect('/');
    const { index } = req.body;
    if (db.keys[index]) {
        db.keys[index].exhausted = !db.keys[index].exhausted;
        saveDatabase(db);
    }
    res.redirect('/');
});

app.post('/admin/add-key', (req, res) => {
    if (!activeAdmins.has(req.ip)) return res.redirect('/');
    const { key, fileUrl } = req.body;
    if (key && fileUrl) {
        db.keys.push({ key, used: false, fileUrl, discordUser: 'Ninguno', exhausted: false });
        saveDatabase(db);
    }
    res.redirect('/');
});

app.post('/admin/delete-key', (req, res) => {
    if (!activeAdmins.has(req.ip)) return res.redirect('/');
    const { index } = req.body;
    if (db.keys[index]) {
        db.keys.splice(index, 1);
        saveDatabase(db);
    }
    res.redirect('/');
});

app.post('/admin/delete-by-name', (req, res) => {
    if (!activeAdmins.has(req.ip)) return res.redirect('/');
    const { keyName } = req.body;
    db.keys = db.keys.filter(k => k.key !== keyName);
    saveDatabase(db);
    res.redirect('/');
});

app.post('/admin/ban-user', (req, res) => {
    if (!activeAdmins.has(req.ip)) return res.redirect('/');
    const { discordUser } = req.body;
    if (discordUser) {
        if (!db.bannedUsers.includes(discordUser)) {
            db.bannedUsers.push(discordUser);
            saveDatabase(db);
        }
    }
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});