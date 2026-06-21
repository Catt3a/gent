import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const SECRET = process.env.SCREENSHOT_SECRET || "";

const app = express();

let latestScreenshot = null;
let latestMeta = {
  updatedAt: null,
  size: 0,
};

const viewers = new Set();

app.use(express.raw({ type: ["image/jpeg", "image/png"], limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

function isAuthorized(req) {
  if (!SECRET) {
    return true;
  }

  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return token === SECRET;
}

function isAuthorizedToken(token) {
  return !SECRET || token === SECRET;
}

function broadcastFrame(data) {
  latestScreenshot = Buffer.from(data);
  latestMeta = {
    updatedAt: new Date().toISOString(),
    size: latestScreenshot.length,
    contentType: "image/jpeg",
  };

  for (const viewer of viewers) {
    if (viewer.readyState === 1) {
      viewer.send(data);
    }
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, viewers: viewers.size });
});

app.post("/api/screenshot", (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!req.body?.length) {
    return res.status(400).json({ error: "Empty screenshot body" });
  }

  broadcastFrame(req.body);
  res.json({ ok: true, ...latestMeta });
});

app.get("/api/screenshot", (_req, res) => {
  if (!latestScreenshot) {
    return res.status(404).json({ error: "No screenshot yet" });
  }

  res.set("Content-Type", latestMeta.contentType || "image/jpeg");
  res.set("Cache-Control", "no-store");
  res.set("X-Updated-At", latestMeta.updatedAt || "");
  res.send(latestScreenshot);
});

app.get("/api/status", (_req, res) => {
  res.json({
    hasScreenshot: Boolean(latestScreenshot),
    viewers: viewers.size,
    ...latestMeta,
  });
});

const server = createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/ws", "http://localhost");
  const role = url.searchParams.get("role");
  const token = url.searchParams.get("token") || "";

  if (role === "broadcaster") {
    if (!isAuthorizedToken(token)) {
      ws.close(4401, "Unauthorized");
      return;
    }

    ws.on("message", (data) => {
      if (!data?.length) {
        return;
      }
      broadcastFrame(data);
    });
    return;
  }

  viewers.add(ws);

  if (latestScreenshot) {
    ws.send(latestScreenshot);
  }

  ws.on("close", () => {
    viewers.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`Screen share server listening on port ${PORT}`);
});
