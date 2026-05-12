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

async function deleteRepo(accessToken, url) {
    const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
    });
}

async function revokeToken(accessToken) {
    await fetch(`https://api.github.com/applications/${process.env.GITHUB_CLIENT_ID}/token`, {
        method: 'DELETE',
        headers: {
            Authorization: `Basic ${Buffer.from(`${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ access_token: accessToken })
    });
}

async function deleteCookie(res) {
    res.setHeader('Set-Cookie', 'token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/');
}

export default async function handler(req, res) {
    const { app_name, owner } = req.body;
    let appRepoCreated = false;

    // Read access token from cookie
    const cookies = Object.fromEntries(
        req.headers.cookie.split('; ').map(c => c.split('='))
    );
    const accessToken = cookies.token;

    // Find out if user is an org or a personal account
    const userResponse = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const user = await userResponse.json();

    try {
        if (user.login === owner) { // Personal Account
            await createRepo(accessToken, 'https://api.github.com/user/repos', app_name);
            appRepoCreated = true;
            await createRepo(accessToken, 'https://api.github.com/user/repos', `${app_name}-config`);
        } else { // Org
            await createRepo(accessToken, `https://api.github.com/orgs/${owner}/repos`, app_name);
            appRepoCreated = true;
            await createRepo(accessToken, `https://api.github.com/orgs/${owner}/repos`, `${app_name}-config`);
        }
    } catch (err) {
        if (appRepoCreated) {
            await deleteRepo(accessToken, `https://api.github.com/repos/${owner}/${app_name}`);
        }
        await revokeToken(accessToken);
        await deleteCookie(res);
        return res.status(500).json({ message: err.message });
    }

    // Repos were created successfully
    await revokeToken(accessToken);
    await deleteCookie(res);
    res.json({ repoUrl: `https://github.com/${owner}/${app_name}` });
}