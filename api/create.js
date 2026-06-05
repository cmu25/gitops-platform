import { validateAppName, revokeToken, deleteCookie, rateLimit } from './utils.js';
async function createRepo(accessToken, url, name, owner) {
    const createRepoResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: name, owner: owner, private: true })
    });
    if (!createRepoResponse.ok) {
        if (createRepoResponse.status === 422) {
            throw new Error(`Repository "${name}" already exists.`);
        } else if (createRepoResponse.status === 403) {
            throw new Error(`You don't have permission to create repositories here.`);
        } else {
            throw new Error(`Failed to create repository "${name}". Please try again.`);
        }
    }
}

async function deleteRepo(accessToken, url) {
    const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
    });
}

export default async function handler(req, res) {
    const { app_name, owner } = req.body;
    let appRepoCreated = false;
    const ip = req.headers['x-forwarded-for'] || 'anonymous'; // Rate limit check
    const { success } = await rateLimit.limit(ip);
    if (!success) {
        return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    // Read access token from cookie
    if (!req.headers.cookie) {
        return res.status(401).json({ message: 'Session expired. Please start over.' });
    }
    const cookies = Object.fromEntries(
        req.headers.cookie.split('; ').map(c => c.split('='))
    );
    const accessToken = cookies.token;

    // Validate app name and owner
    const validationError = validateAppName(app_name);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }
    if (!owner) {
    return res.status(400).json({ message: 'Owner is required.' });
    }

    try {
        await createRepo(accessToken, 'https://api.github.com/repos/cmu25/gitops-app-template/generate', app_name, owner);
        appRepoCreated = true;
        await createRepo(accessToken, 'https://api.github.com/repos/cmu25/gitops-config-template/generate', `${app_name}-config`, owner);
    } catch (err) {
        if (appRepoCreated) {
            await deleteRepo(accessToken, `https://api.github.com/repos/${owner}/${app_name}`);
        }
        await revokeToken(accessToken);
        await deleteCookie(res);
        return res.status(500).json({ message: err.message });
    }

    // Put app name and owner in cookie so it can be used after app creation (GitHub sends different state)
    res.setHeader('Set-Cookie', [
        `app_name=${app_name}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`,
        `owner=${owner}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`
    ]);
    res.json({ repoUrl: `https://github.com/${owner}/${app_name}` });
}