import { verifyState, revokeToken, deleteCookie, createRepoSecret } from './utils.js';

export default async function handler(req, res) {
    const { installation_id, setup_action, state } = req.query;

    if (setup_action !== 'install') {
        return res.status(400).send(`Unexpected setup_action: ${setup_action}`);
    }

    const cookies = Object.fromEntries(
        req.headers.cookie.split('; ').map(c => c.split('='))
    );
    const accessToken = cookies.token;

    const app_name = cookies.app_name;
    const owner = cookies.owner;

    await createRepoSecret(owner, app_name,             'GITHUB_APP_INSTALLATION_ID', installation_id, accessToken);
    await createRepoSecret(owner, `${app_name}-config`, 'GITHUB_APP_INSTALLATION_ID', installation_id, accessToken);

    await revokeToken(accessToken);
    await deleteCookie(res);

    return res.redirect(`https://github.com/${owner}/${app_name}`);
}