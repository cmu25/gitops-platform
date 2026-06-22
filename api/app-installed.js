import { revokeToken, deleteCookie, createRepoSecret } from './utils.js';
import { renderCredentialsPage } from './render-credentials-page.js';

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
    const app_name = cookies.app_name;
    const owner = cookies.owner;
    const app_id = cookies.app_id;
    const app_private_key = decodeURIComponent(cookies.app_private_key || '');

    await createRepoSecret(owner, app_name,             'BOT_APP_INSTALLATION_ID', installation_id, accessToken);
    await createRepoSecret(owner, `${app_name}-config`, 'BOT_APP_INSTALLATION_ID', installation_id, accessToken);

    await revokeToken(accessToken);
    await deleteCookie(res);

    // Clear the temporary credential cookies — they must not outlive this response.
    res.setHeader('Set-Cookie', [
        'app_id=; Max-Age=0; Path=/',
        'app_private_key=; Max-Age=0; Path=/',
    ]);

    const html = renderCredentialsPage({
        owner,
        app_name,
        bot_id: app_id,
        bot_app_installation_id: installation_id,
        bot_private_key: app_private_key,
        repo_url: `https://github.com/${owner}/${app_name}`,
    });

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
}