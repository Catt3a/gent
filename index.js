import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const SECRET = process.env.SCREENSHOT_SECRET || "";

const app = express();

let latestScreenshot = null;
let latestMeta = {
  updatedAt: null,
  size: 0,
};

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

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/screenshot", (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!req.body?.length) {
    return res.status(400).json({ error: "Empty screenshot body" });
  }

  const contentType = req.get("content-type") || "image/jpeg";
  latestScreenshot = Buffer.from(req.body);
  latestMeta = {
    updatedAt: new Date().toISOString(),
    size: latestScreenshot.length,
    contentType,
  };

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
    ...latestMeta,
  });
});

app.listen(PORT, () => {
  console.log(`Screen share server listening on port ${PORT}`);
});
