import { revokeToken, deleteCookie, createRepoSecret } from './utils.js';

export default async function handler(req, res) {
    const { installation_id, setup_action, state } = req.query;

    if (setup_action !== 'install') {
        return res.status(400).send(`Unexpected setup_action: ${setup_action}`);
    }

    const cookies = Object.fromEntries(
        req.headers.cookie.split('; ').map(c => {
            const [key, ...rest] = c.split('=');
            return [key, rest.join('=')];
        })
    );
    const accessToken = cookies.token;

    if (!accessToken) {
        return res.status(400).json({ message: 'Session expired. Please start over.' });
    }

    const app_name = cookies.app_name;
    const owner = cookies.owner;

    // Store credentials as repo secrets
    try {
        await createRepoSecret(owner, app_name,             'BOT_APP_INSTALLATION_ID', installation_id, accessToken);
        await createRepoSecret(owner, `${app_name}-config`, 'BOT_APP_INSTALLATION_ID', installation_id, accessToken);
    } catch (err) {
        await revokeToken(accessToken);
        await deleteCookie(res);
        return res.redirect(`/?error=${encodeURIComponent('GitHub App was created but installation ID could not be stored. Please add BOT_INSTALLATION_ID manually to both of your repo’s secrets.')}`);
    }

    await revokeToken(accessToken);
    await deleteCookie(res);

    return res.redirect(`https://github.com/${owner}/${app_name}`);
}