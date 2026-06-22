function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

export function renderCredentialsPage({ owner, app_name, bot_id, bot_app_installation_id, bot_private_key, repo_url }) {
    const envContents =
        `BOT_ID=${bot_id}
BOT_APP_INSTALLATION_ID=${bot_app_installation_id}
BOT_PRIVATE_KEY="${bot_private_key}"`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Setup complete</title>
</head>
<body>
  <h1>GitOps Template App</h1>

  <p>Your repositories and GitHub App are ready.</p>

  <p><strong>Download your .env file before continuing. You will not see these credentials again.</strong><br>
  If you lose it, you will need to generate a new private key for your GitHub App and update the repo secrets manually.</p>

  <button onclick="downloadEnv()">Download .env</button>

  <div id="repo-link" style="display:none">
    <br><br>
    <p>Done. Place the .env file in the root of your cloned repo, then follow the steps in SETUP.md.</p>
    <a href="${escapeHtml(repo_url)}">Go to your repo</a>
  </div>

  <script>
    const envContents = ${JSON.stringify(envContents)};

    function downloadEnv() {
      const blob = new Blob([envContents], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'env';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      document.getElementById('repo-link').style.display = 'block';
    }
  </script>
</body>
</html>`;
}