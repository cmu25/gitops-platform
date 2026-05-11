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
const { app_name, owner } = req.body;

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

if (user.login === owner) {
        try {
            // User is personal account, use user to create repos
            await createRepo(accessToken, 'https://api.github.com/user/repos', app_name);
            await createRepo(accessToken, 'https://api.github.com/user/repos', `${app_name}-config`);
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    } else {
        // User is org
        try {
            await createRepo(accessToken, `https://api.github.com/orgs/${owner}/repos`, app_name);
            await createRepo(accessToken, `https://api.github.com/orgs/${owner}/repos`, `${app_name}-config`);
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    }

    // Repos were created successfully, now redirect
    res.json({ repoUrl: `https://github.com/${owner}/${app_name}` });
}