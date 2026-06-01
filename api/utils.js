import crypto from 'crypto';
import _sodium from 'libsodium-wrappers';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
export { rateLimit, generateState, verifyState, revokeToken, deleteCookie, validateAppName, createRepoSecret };

const rateLimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1m'),
});

function generateState(app_name, owner = '') {
    const nonce = crypto.randomBytes(16).toString('hex');
    const hmac = crypto.createHmac('sha256', process.env.STATE_SECRET);
    hmac.update(nonce);
    const hash = hmac.digest('hex'); // Hash state secret
    const json = { nonce, hash, app_name, owner };
    return encodeURIComponent(JSON.stringify(json));
}

async function verifyState(state){
    // Turn state string into JSON object
    const stateString = decodeURIComponent(state);
    const stateObj = JSON.parse(stateString);

    // Extract nonce
    const receivedHash = stateObj.hash;

    // Recreate hash
    const hmac = crypto.createHmac('sha256', process.env.STATE_SECRET);
    hmac.update(stateObj.nonce);
    const hash = hmac.digest('hex');

    // Verify hashes are identical
    if (receivedHash !== hash){
        throw new Error('Error');
    }
    return stateObj;
}

async function deleteCookie(res) {
    res.setHeader('Set-Cookie', 'token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
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



function validateAppName(app_name){
    if(app_name.length < 1 || app_name.length > 100){
        throw new Error("App name must be between 1 and 100 characters.");
    }
    else if(/[^A-Za-z0-9\-\_]/.test(app_name)){
        throw new Error("App name can only contain letters, numbers, hyphens and underscores.");
    }
    return null;
}

async function encryptSecret(publicKey, secretValue) {
    await _sodium.ready;
    const sodium = _sodium;
    const key = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
    const message = sodium.from_string(secretValue);
    const encrypted = sodium.crypto_box_seal(message, key);
    return sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);
}

async function getRepoPublicKey(owner, repo, accessToken) {
    const repoKeyResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`
        }
    });
    return await repoKeyResponse.json();
}

async function createRepoSecret(owner, repo, secretName, value, accessToken){
    const publicKey = await getRepoPublicKey(owner, repo, accessToken);
    const encryptedValue = await encryptSecret(publicKey.key, value);
    const createSecretResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            encrypted_value: encryptedValue,
            key_id: publicKey.key_id
        })
    });
    return await createSecretResponse.json();
}
