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
const ADMIN_PASSWORD = "admin123";

app.get('/', (req, res) => {
    const isAdmin = req.query.admin === ADMIN_PASSWORD;
    
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
                    <input type="hidden" name="password" value="${ADMIN_PASSWORD}">
                    <input type="hidden" name="index" value="${index}">
                    <button class="btn btn-sm ${item.blocked ? 'btn-success' : 'btn-danger'}">
                        ${item.blocked ? 'Desbloquear' : 'Bloquear Key'}
                    </button>
                </form>
            </td>
        ` : '';

        return `
            <tr>
                <td class="font-mono key-text">${item.key}</td>
                <td>${statusBadge}</td>
                <td>${item.discordUser}</td>
                <td class="url-text"><a href="${item.fileUrl}" target="_blank">${item.fileUrl}</a></td>
                ${adminActions}
            </tr>
        `;
    }).join('');

    let adminLoginSection = isAdmin ? `
        <span style="color: #10b981; font-weight: 600; font-size: 13px;"> Modo Admin Activo</span>
        <a href="/" class="btn btn-danger btn-sm" style="text-decoration:none;">Salir</a>
    ` : `
        <form action="/" method="GET" style="display:flex; gap:8px;">
            <input type="password" name="admin" placeholder="Clave de Admin" required>
            <button class="btn btn-sm">Acceder</button>
        </form>
    `;

    let adminPanelSection = isAdmin ? `
        <div class="panel-box">
            <h3 style="margin-bottom: 15px; font-size:16px;">➕ Generar Nueva Key</h3>
            <form action="/admin/add-key" method="POST" style="display:flex; gap:10px; flex-wrap: wrap;">
                <input type="hidden" name="password" value="${ADMIN_PASSWORD}">
                <input type="text" name="key" placeholder="Ej: MFA-KEY-2026" required style="flex:1;">
                <input type="text" name="fileUrl" placeholder="Link de descarga (MEGA/Mediafire)" required style="flex:2;">
                <button class="btn btn-success">Añadir Clave</button>
            </form>
        </div>
        <div class="panel-box">
            <h3 style="margin-bottom: 15px; font-size:16px;">🚫 Banear Usuario de Discord</h3>
            <form action="/admin/ban-user" method="POST" style="display:flex; gap:10px;">
                <input type="hidden" name="password" value="${ADMIN_PASSWORD}">
                <input type="text" name="discordUser" placeholder="Usuario#0000 o ID de Discord" required style="flex:1;">
                <button class="btn btn-danger">Banear Usuario</button>
            </form>
            <p style="font-size: 12px; color: var(--text-dim); margin-top: 10px;">Baneados actualmente: ${bannedUsers.join(', ') || 'Ninguno'}</p>
        </div>
    ` : '';

    let adminHeaderAction = isAdmin ? '<th>Acción Admin</th>' : '';

    // Leer el archivo HTML externo y reemplazar variables
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, htmlTemplate) => {
        if (err) {
            return res.status(500).send('Error al cargar la interfaz web.');
        }

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

app.post('/admin/toggle-block', (req, res) => {
    const { password, index } = req.body;
    if (password === ADMIN_PASSWORD && keysDatabase[index]) {
        keysDatabase[index].blocked = !keysDatabase[index].blocked;
    }
    res.redirect(`/?admin=${ADMIN_PASSWORD}`);
});

app.post('/admin/add-key', (req, res) => {
    const { password, key, fileUrl } = req.body;
    if (password === ADMIN_PASSWORD && key && fileUrl) {
        keysDatabase.push({ key, used: false, fileUrl, discordUser: 'Ninguno', blocked: false });
    }
    res.redirect(`/?admin=${ADMIN_PASSWORD}`);
});

app.post('/admin/ban-user', (req, res) => {
    const { password, discordUser } = req.body;
    if (password === ADMIN_PASSWORD && discordUser) {
        if (!bannedUsers.includes(discordUser)) bannedUsers.push(discordUser);
    }
    res.redirect(`/?admin=${ADMIN_PASSWORD}`);
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