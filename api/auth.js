import crypto from 'crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1m'), // No more than 10 requests per minute per IP
});

export default async function handler(req, res){
    const ip = req.headers['x-forwarded-for'] || 'anonymous'; // Rate limit check
    const { success } = await ratelimit.limit(ip);
    if (!success) {
        return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    const { app_name } = req.query;

    // Create nonce
    const nonce = crypto.randomBytes(16).toString('hex');

    // Hash state secret
    const hmac = crypto.createHmac('sha256', process.env.STATE_SECRET);
    hmac.update(nonce);
    const hash = hmac.digest('hex');

    // Create JSON object with necessary things to put in state (app_name, nonce, hmac hash)
    const json = {nonce: nonce, hash: hash, app_name: app_name};

    // Stringify JSON obj
    const state_string = encodeURIComponent(JSON.stringify(json));

    // redirect to https://github.com/login/oauth/authorize with Client Id and state (JSON object)
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo%20read:org%20delete_repo&state=${state_string}`;
    res.redirect(url);
}