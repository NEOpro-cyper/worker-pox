const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET = process.env.TARGET_URL || "https://empty-base-0d5e.jeannefrankli-n2-7-2-0-5.workers.dev";

// ── CORS ─────────────────────────────────────────────
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,PATCH,OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ── Health check ─────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", target: TARGET });
});

// ── Proxy everything else ────────────────────────────
app.use(
  "/",
  createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    secure: true,
    ws: true,
    logLevel: "warn",

    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader("X-Forwarded-For", req.socket.remoteAddress || "");
      proxyReq.setHeader("X-Real-IP", req.socket.remoteAddress || "");
      proxyReq.setHeader("X-Forwarded-Proto", req.protocol);
    },

    onProxyRes: (proxyRes) => {
      // Strip headers that block iframe embedding
      delete proxyRes.headers["x-frame-options"];
      delete proxyRes.headers["content-security-policy"];
      proxyRes.headers["access-control-allow-origin"] = "*";
    },

    onError: (err, req, res) => {
      console.error("Proxy Error:", err.message);
      if (res.writeHead) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Proxy Error", message: err.message }));
      }
    },
  })
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Proxy running on port ${PORT}`);
  console.log(`➡️  Forwarding to: ${TARGET}`);
});
