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

function validateAppName(app_name){
    if(app_name.length < 1 || app_name.length > 100){
        return "App name must be between 1 and 100 characters.";
    }
    else if(/[^A-Za-z0-9\-\_]/.test(app_name)){
        return "App name can only contain letters, numbers, hyphens and underscores."
    }
    return null;
}

export default async function handler(req, res) {
    const { app_name, owner } = req.body;
    let appRepoCreated = false;

    // Validate app name and owner
    const validationError = validateAppName(app_name);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }
    if (!owner) {
    return res.status(400).json({ message: 'Owner is required.' });
    }

    // Read access token from cookie
    const cookies = Object.fromEntries(
        req.headers.cookie.split('; ').map(c => c.split('='))
    );
    const accessToken = cookies.token;

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

    // Repos were created successfully
    await revokeToken(accessToken);
    await deleteCookie(res);
    res.json({ repoUrl: `https://github.com/${owner}/${app_name}` });
}