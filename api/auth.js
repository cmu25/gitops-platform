import {generateState, rateLimit} from "./utils.js";

export default async function handler(req, res){
    const ip = req.headers['x-forwarded-for'] || 'anonymous'; // Rate limit check
    const { success } = await rateLimit.limit(ip);
    if (!success) {
        return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    const { app_name } = req.query;

    const state_string = generateState(app_name);

    // redirect to https://github.com/login/oauth/authorize with Client ID and state (JSON object)
    const URL = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo%20read:org%20delete_repo&state=${state_string}`;
    res.redirect(URL);
}