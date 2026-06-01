import {verifyState} from "./utils.js";
export default async function handler(req, res){
const { code, state } = req.query;
    let stateObj;
    try {
        stateObj = await verifyState(state);
    } catch (err) {
        return res.status(403).send('Invalid state — possible CSRF attack');
    }
    const app_name = await stateObj.app_name;

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

    // Save access Token as Cookie
    res.setHeader('Set-Cookie', `token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`);

    // Fetch user and orgs
    const userResponse = await fetch('https://api.github.com/user', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
    });
    const user = await userResponse.json();
    const username = user.login;
    
    const orgsResponse = await fetch('https://api.github.com/user/orgs', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
    });
    const orgs = await orgsResponse.json();
    const orgNames = orgs.map(org => org.login);

    res.redirect(`/?app_name=${app_name}&user=${username}&orgs=${encodeURIComponent(JSON.stringify(orgNames))}`);
}