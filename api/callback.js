async function createRepo(accessToken, url, name) {
  const createRepoResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: name, private: true })
        });
        const data = await createRepoResponse.json();

        if (!createRepoResponse.ok) {
            throw new Error(`Failed to create ${name}: ${data.message}`);
        }
}

export default async function handler(req, res){
const { code, state } = req.query;
    // Turn state string into json object
    const statestring = decodeURIComponent(state);
    const stateObj = JSON.parse(statestring);

    // Extract nonce
    const recievedHash = stateObj.hash;

    // Recreate hash
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.STATE_SECRET);
    hmac.update(stateObj.nonce);
    const hash = hmac.digest('hex');

    // Verify hashes are identical
    if (recievedHash != hash){
        return res.status(403).send('Invalid state — possible CSRF attack');
    }
    
    const app_name = stateObj.app_name;
    const owner = stateObj.owner;

    // exchange code for access token
    const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code: code })
    });
    const data = await response.json();

    // Handle OAuth Errors
    if (data.error || !data.access_token) {
    return res.status(400).send(`GitHub OAuth error: ${data.error}`);
    }

    // Extract Access Token
    const accessToken = data.access_token;

    // Find out if user is an org or a personal account
    const userResponse = await fetch('https://api.github.com/user', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
    });
    const user = await userResponse.json();

    if (user.login === owner) {
        try {
            // User is personal account, use user to create repos
            await createRepo(accessToken, 'https://api.github.com/user/repos', app_name);
            await createRepo(accessToken, 'https://api.github.com/user/repos', `${app_name}-config`);
        } catch (err) {
            return res.status(500).send(err.message);
        }
    } else {
        // User is org
        try {
            await createRepo(accessToken, `https://api.github.com/orgs/${owner}/repos`, app_name);
            await createRepo(accessToken, `https://api.github.com/orgs/${owner}/repos`, `${app_name}-config`);
        } catch (err) {
            return res.status(500).send(err.message);
        }
    }

    // Repos were created successfully, now redirect
    res.redirect(`/?success=true&app=${app_name}&owner=${owner}`);
}