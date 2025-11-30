import { GraphQLClient, gql } from 'graphql-request';

// Helper to get access token
async function getAccessToken(code) {
    const response = await fetch('https://anilist.co/api/v2/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: process.env.ANILIST_CLIENT_ID,
            client_secret: process.env.ANILIST_CLIENT_SECRET,
            redirect_uri: process.env.ANILIST_REDIRECT_URI,
            code: code,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to get access token');
    }

    return await response.json();
}

// Helper to get authenticated user
async function getAuthenticatedUser(accessToken) {
    const client = new GraphQLClient('https://graphql.anilist.co', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    const query = gql`
        query {
            Viewer {
                id
                name
                avatar {
                    large
                }
            }
        }
    `;

    const data = await client.request(query);
    return data.Viewer;
}

// Helper to save to Supabase
// Helper to save to Supabase
async function saveConnection(discordUserId, anilistData, tokens) {
    // First, try to update existing connection
    const updateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_connections?discord_user_id=eq.${discordUserId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            anilist_user_id: anilistData.id,
            anilist_username: anilistData.name,
            anilist_access_token: tokens.access_token,
            anilist_refresh_token: tokens.refresh_token,
            token_expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
            updated_at: new Date().toISOString()
        })
    });

    // If update found a record, we're done
    if (updateResponse.ok) {
        const result = await updateResponse.json();
        if (result && result.length > 0) {
            return result[0];
        }
    }

    // If no existing record, insert new one
    const insertResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_connections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            discord_user_id: discordUserId,
            anilist_user_id: anilistData.id,
            anilist_username: anilistData.name,
            anilist_access_token: tokens.access_token,
            anilist_refresh_token: tokens.refresh_token,
            token_expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
    });

    if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        console.error('Failed to save connection:', errorText);
        throw new Error('Failed to save connection to database');
    }

    return await insertResponse.json();
}

// Main handler
export default async function handler(req, res) {
    const { code, state } = req.query;

    if (!code || !state) {
        return res.status(400).send(`
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
        const tokens = await getAccessToken(code);
        const anilistUser = await getAuthenticatedUser(tokens.access_token);
        await saveConnection(state, anilistUser, tokens);

        console.log(`✅ Connected ${anilistUser.name} for user ${state}`);

        res.status(200).send(`
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
        res.status(500).send(`
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
}