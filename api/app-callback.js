import {validateAppName, revokeToken, deleteCookie, createRepoSecret} from './utils.js';
export default async function handler(req, res){
    const { code, state } = req.query;
    if (!req.headers.cookie) {
        return res.status(401).json({ message: 'Session expired. Please start over.' });
    }
    const cookies = Object.fromEntries(
        req.headers.cookie.split('; ').map(c => {
            const [key, ...rest] = c.split('=');
            return [key, rest.join('=')];
        })
    );
    const accessToken = cookies.token;
    const app_name = cookies.app_name;
    const owner = cookies.owner;

    // Validate App Name
    const validationError = validateAppName(app_name);
    if (validationError) {
        await revokeToken(accessToken);
        await deleteCookie(res);
        return res.status(400).json({ message: validationError });
    }

    // exchange code for credentials
    const credResponse = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    });
    const credentials = await credResponse.json();
    if (!credResponse.ok) {
        await revokeToken(accessToken);
        await deleteCookie(res);
        return res.status(400).json({ message: `Failed to exchange code for credentials: ${credentials.message}` });
    }

    const app_id = credentials.id;
    const app_private_key = credentials.pem;

    // Store credentials as repo secrets
    try {
        await createRepoSecret(owner, app_name, 'BOT_ID', app_id, accessToken);
        await createRepoSecret(owner, app_name, 'BOT_PRIVATE_KEY', app_private_key, accessToken);
        await createRepoSecret(owner, `${app_name}-config`, 'BOT_ID', app_id, accessToken);
        await createRepoSecret(owner, `${app_name}-config`, 'BOT_PRIVATE_KEY', app_private_key, accessToken);
    } catch (err) {
        await revokeToken(accessToken);
        await deleteCookie(res);
        return res.redirect(`/?error=${encodeURIComponent('Failed to create GitHub App. Please try again.')}`);
    }

    const app_slug = credentials.slug;
    return res.redirect(`https://github.com/apps/${app_slug}/installations/new`);
}