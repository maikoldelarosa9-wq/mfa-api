const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let keysDatabase = [
    { key: 'MFA-KEY-9981', used: false, fileUrl: 'https://mega.nz/archivo-ejemplo-1', discordUser: 'Ninguno', blocked: false },
    { key: 'MFA-KEY-1234', used: false, fileUrl: 'https://mega.nz/archivo-ejemplo-2', discordUser: 'Ninguno', blocked: false },
    { key: 'MFA-KEY-5678', used: true, fileUrl: 'https://mega.nz/archivo-ejemplo-3', discordUser: 'Usuario#1234', blocked: false }
];

let bannedUsers = ['UsuarioTraficante#0000'];
const ADMIN_PASSWORD = ".gg";

// Almacenamiento temporal de sesiones activas por IP o memoria simple
let activeAdmins = new Set();

app.get('/', (req, res) => {
    // Si recarga, limpiamos cualquier estado anterior o validamos por parámetro temporal
    const clientIp = req.ip;
    const isAdmin = activeAdmins.has(clientIp);
    
    let totalKeys = keysDatabase.length;
    let usedKeys = keysDatabase.filter(k => k.used).length;
    let blockedKeys = keysDatabase.filter(k => k.blocked).length;
    let availableKeys = totalKeys - usedKeys - blockedKeys;

    let rows = keysDatabase.map((item, index) => {
        let statusBadge = item.blocked 
            ? '<span class="badge badge-blocked">⛔ Bloqueada</span>' 
            : (item.used 
                ? '<span class="badge badge-used">🔴 Utilizada</span>' 
                : '<span class="badge badge-active">🟢 Disponible</span>');

        let adminActions = isAdmin ? `
            <td style="padding: 14px;">
                <form action="/admin/toggle-block" method="POST" style="display:inline;">
                    <input type="hidden" name="index" value="${index}">
                    <button class="btn btn-sm ${item.blocked ? 'btn-success' : 'btn-danger'}">
                        ${item.blocked ? 'Desbloquear' : 'Bloquear'}
                    </button>
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

    // Solo muestra el campo para poner la clave y acceder de forma limpia
    let adminLoginSection = isAdmin ? `
        <form action="/admin/logout" method="POST">
            <button class="btn btn-danger btn-sm">Cerrar Sesión</button>
        </form>
    ` : `
        <form action="/admin/login" method="POST" style="display:flex; gap:8px;">
            <input type="password" name="password" placeholder="Clave admin" required>
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
            <div class="panel-title">🚫 Banear Usuario de Discord</div>
            <form action="/admin/ban-user" method="POST" style="display:flex; gap:10px;">
                <input type="text" name="discordUser" placeholder="Usuario#0000" required style="flex:1;">
                <button class="btn btn-danger">Banear Usuario</button>
            </form>
            <p style="font-size: 12px; color: #888; margin-top: 10px;">Usuarios baneados: ${bannedUsers.join(', ') || 'Ninguno'}</p>
        </div>
    ` : '';

    let adminHeaderAction = isAdmin ? '<th>Acción</th>' : '';

    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, htmlTemplate) => {
        if (err) return res.status(500).send('Error al cargar la interfaz web.');

        let finalHtml = htmlTemplate
            .replace('{{{adminLoginSection}}}', adminLoginSection)
            .replace('{{totalKeys}}', totalKeys)
            .replace('{{availableKeys}}', availableKeys)
            .replace('{{usedKeys}}', usedKeys)
            .replace('{{blockedKeys}}', blockedKeys)
            .replace('{{{adminPanelSection}}}', adminPanelSection)
            .replace('{{{adminHeaderAction}}}', adminHeaderAction)
            .replace('{{{rows}}}', rows);

        res.send(finalHtml);
    });
});

app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        activeAdmins.add(req.ip);
    }
    res.redirect('/');
});

app.post('/admin/logout', (req, res) => {
    activeAdmins.delete(req.ip);
    res.redirect('/');
});

app.post('/admin/toggle-block', (req, res) => {
    if (!activeAdmins.has(req.ip)) return res.redirect('/');
    const { index } = req.body;
    if (keysDatabase[index]) {
        keysDatabase[index].blocked = !keysDatabase[index].blocked;
    }
    res.redirect('/');
});

app.post('/admin/add-key', (req, res) => {
    if (!activeAdmins.has(req.ip)) return res.redirect('/');
    const { key, fileUrl } = req.body;
    if (key && fileUrl) {
        keysDatabase.push({ key, used: false, fileUrl, discordUser: 'Ninguno', blocked: false });
    }
    res.redirect('/');
});

app.post('/admin/ban-user', (req, res) => {
    if (!activeAdmins.has(req.ip)) return res.redirect('/');
    const { discordUser } = req.body;
    if (discordUser) {
        if (!bannedUsers.includes(discordUser)) bannedUsers.push(discordUser);
    }
    res.redirect('/');
});

app.get('/getkey', (req, res) => {
    const userKey = req.query.key;
    const discordUser = req.query.user || 'Usuario de Discord';

    if (bannedUsers.includes(discordUser)) {
        return res.json({ valid: false, message: 'Tu usuario de Discord está baneado del sistema.' });
    }

    if (!userKey) {
        return res.json({ valid: false, message: 'No se proporcionó ninguna clave.' });
    }

    const foundKey = keysDatabase.find(k => k.key === userKey);

    if (!foundKey) {
        return res.json({ valid: false, message: 'La clave ingresada no existe.' });
    }

    if (foundKey.blocked) {
        return res.json({ valid: false, message: 'Esta clave ha sido bloqueada por el administrador.' });
    }

    if (foundKey.used) {
        return res.json({ valid: false, message: 'Esta clave ya fue utilizada anteriormente.' });
    }

    foundKey.used = true;
    foundKey.discordUser = discordUser;

    return res.json({
        valid: true,
        fileUrl: foundKey.fileUrl,
        message: '¡Clave canjeada con éxito!'
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});