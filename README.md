# Screen Share (Node.js client + Render server)

Node.js client captures the **full screen** and sends JPEG/PNG screenshots to a JavaScript server on Render.

## Server (Render)

1. Push this repo to GitHub.
2. Create a Web Service on Render from the repo.
3. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment variable**: `SCREENSHOT_SECRET` (any secret string)
4. Open `https://your-app.onrender.com/` to view the screen.

Local test:

```bash
cd server
npm install
set SCREENSHOT_SECRET=test123
npm start
```

## Client (your PC)

```bash
cd client
npm install
copy .env.example .env
```

Edit `.env`:

```env
SERVER_URL=https://your-app.onrender.com
SCREENSHOT_SECRET=test123
INTERVAL_MS=1000
SCREENSHOT_FORMAT=jpg
```

Run:

```bash
npm start
```

The client uses `screenshot-desktop` and captures the entire primary screen on Windows/macOS/Linux.

## API

- `POST /api/screenshot` — upload screenshot (`Authorization: Bearer <SECRET>`)
- `GET /api/screenshot` — latest screenshot
- `GET /api/status` — metadata
- `GET /health` — health check
