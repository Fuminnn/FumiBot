import express from 'express';
import dotenv from 'dotenv';
import { anilistAuth } from './services/anilistAuth.js';
import { db } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!code || !state) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error - Anime Notifier</title>
                <style>
                    body { font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .container { background: white; padding: 40px; border-radius: 10px; text-align: center; max-width: 500px; }
                    h1 { color: #e74c3c; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Connection Failed</h1>
                    <p>Missing authorization code. Please try again from Discord.</p>
                </div>
            </body>
            </html>
        `);
    }

    try {
        const tokens = await anilistAuth.getAccessToken(code);
        const anilistUser = await anilistAuth.getAuthenticatedUser(tokens.access_token);
        await db.saveAniListConnection(state, anilistUser, tokens);

        console.log(`✅ Connected ${anilistUser.name} for user ${state}`);

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Success - Anime Notifier</title>
                <style>
                    body { font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .container { background: white; padding: 40px; border-radius: 10px; text-align: center; max-width: 500px; }
                    h1 { color: #27ae60; }
                    .username { font-size: 24px; font-weight: bold; color: #667eea; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ Connection Successful!</h1>
                    <div class="username">${anilistUser.name}</div>
                    <p>Your AniList account has been connected!</p>
                    <p>Return to Discord and use:</p>
                    <ul style="text-align: left;">
                        <li><code>/import</code> - Import your watching list</li>
                        <li><code>/sync</code> - Sync with AniList</li>
                        <li><code>/status</code> - Check connection</li>
                    </ul>
                    <p style="margin-top: 20px;">You can close this window.</p>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('OAuth callback error:', error);
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error - Anime Notifier</title>
                <style>
                    body { font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .container { background: white; padding: 40px; border-radius: 10px; text-align: center; max-width: 500px; }
                    h1 { color: #e74c3c; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ Connection Failed</h1>
                    <p>Error: ${error.message}</p>
                    <p>Please try again using <code>/connect</code> in Discord.</p>
                </div>
            </body>
            </html>
        `);
    }
});

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Anime Notifier Bot</title>
            <style>
                body { font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .container { background: white; padding: 40px; border-radius: 10px; text-align: center; max-width: 500px; }
                h1 { color: #667eea; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 Anime Notifier Bot</h1>
                <p>OAuth Server Running</p>
                <p>Use <code>/connect</code> in Discord to link your AniList account.</p>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🌐 OAuth callback server running on port ${PORT}`);
});

export { app };