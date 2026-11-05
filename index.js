const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base de datos en memoria
let keysDatabase = [
    { key: 'MFA-KEY-9981', used: false, fileUrl: 'https://mega.nz/archivo-ejemplo-1', discordUser: 'Ninguno', blocked: false },
    { key: 'MFA-KEY-1234', used: false, fileUrl: 'https://mega.nz/archivo-ejemplo-2', discordUser: 'Ninguno', blocked: false },
    { key: 'MFA-KEY-5678', used: true, fileUrl: 'https://mega.nz/archivo-ejemplo-3', discordUser: 'Usuario#1234', blocked: false }
];

let bannedUsers = ['UsuarioTraficante#0000'];
const ADMIN_PASSWORD = "admin123";

// 1. WEB PRINCIPAL Y PANEL DE CONTROL
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
                <td class="url-text"><a href="${item.fileUrl}" target="_blank">${item.fileUrl}</a></td>${adminActions}
            </tr>
        `;
    }).join('');

    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PROJECT X — Panel de Administración & API</title>
            <style>
                :root {
                    --bg-dark: #08090c;
                    --card-bg: rgba(22, 25, 35, 0.7);
                    --primary: #6366f1;
                    --primary-hover: #4f46e5;
                    --accent: #06b6d4;
                    --text: #f3f4f6;
                    --text-dim: #9ca3af;
                    --border: rgba(255, 255, 255, 0.08);
                }
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
                body { background: var(--bg-dark); color: var(--text); min-height: 100vh; padding: 40px 20px; background-image: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15),