# HF Drive Index

HuggingFace file browser deployed on Cloudflare Pages.

## Quick Start

### Local Development
```bash
npm run dev
```
This starts a local server at `http://localhost:8788`.

### Deploy to Cloudflare Pages

**Option A — Via Dashboard (Easiest):**
1. Push this folder to a GitHub/GitLab repo
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages**
3. Connect your Git repo
4. Build settings:
   - Build command: *(leave empty)*
   - Build output directory: `/`
5. Add environment variables:
   - `USERS` → `{"admin":"your_password","user2":"password2"}`
   - `HF_TOKEN` → (optional, for private repos)
6. Deploy!

**Option B — Via CLI:**
```bash
npx wrangler pages project create hf-drive-index
npx wrangler pages deploy .
```

### Configuration

#### Login Credentials
Edit `functions/api/auth.js` or set the `USERS` environment variable:
```json
{"admin": "your_secure_password", "user2": "another_password"}
```

#### HuggingFace Repo
Edit `app.js` → `CONFIG.repos` array to change which repo to index:
```js
repos: [
  { id: 'Lalapo1/chiyo', name: 'Chiyo', type: 'bucket', revision: 'main' }
]
```

#### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `USERS` | No | JSON object of username:password pairs |
| `HF_TOKEN` | No | HuggingFace API token for private repos |

## Default Login
- Username: `admin`
- Password: `admin123`

> ⚠️ **Change these before deploying to production!**
