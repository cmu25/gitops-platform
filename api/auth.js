export default function handler(req, res){
    const { app_name, owner } = req.query;
    const crypto = require('crypto');

    // Create nonce
    const nonce = crypto.randomBytes(16).toString('hex');

    // Hash state secret
    const hmac = crypto.createHmac('sha256', process.env.STATE_SECRET);
    hmac.update(nonce);
    const hash = hmac.digest('hex');

    // Create JSON object with necessary things to put in state (app_name, owner, state secret)
    const json = {nonce: nonce, hash: hash, app_name: app_name, owner: owner};

    // Stringify JSON obj
    const state_string = JSON.stringify(json);

    // redirect to https://github.com/login/oauth/authorize with Client Id and state (JSON object)
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&state=${encodeURIComponent(state_string)}`;    
    res.redirect(url);
}