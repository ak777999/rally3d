import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { MatchManager } from "./matchManager.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 5173);
const isProd = process.env.NODE_ENV === "production";

const manager = new MatchManager();

async function main() {
  const server = http.createServer();
  let vite: ViteDevServer | null = null;

  if (!isProd) {
    vite = await createViteServer({
      root: ROOT,
      appType: "custom",
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: { server },
      },
    });
  }

  server.on("request", async (req, res) => {
    try {
      if (req.url?.startsWith("/ws")) {
        res.statusCode = 400;
        res.end("WebSocket only");
        return;
      }
      if (vite) {
        vite.middlewares(req, res, async () => {
          const url = req.url || "/";
          const template = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
          const html = await vite!.transformIndexHtml(url, template);
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        });
        return;
      }

      const dist = path.join(ROOT, "dist");
      const urlPath = (req.url ?? "/").split("?")[0];
      const candidate = path.join(dist, urlPath === "/" ? "index.html" : urlPath);
      const file =
        candidate.startsWith(dist) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
          ? candidate
          : path.join(dist, "index.html");
      const ext = path.extname(file);
      const types: Record<string, string> = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".json": "application/json",
      };
      res.statusCode = 200;
      res.setHeader("Content-Type", types[ext] ?? "application/octet-stream");
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const url = req.url ?? "";
    if (url.startsWith("/ws")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
      return;
    }
    if (vite) {
      // Let Vite HMR handle other upgrades.
      return;
    }
    socket.destroy();
  });

  wss.on("connection", (ws) => {
    ws.on("message", (data) => manager.handle(ws, String(data)));
    ws.on("close", () => manager.disconnect(ws));
    ws.on("error", () => manager.disconnect(ws));
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`RALLY3D  http://0.0.0.0:${PORT}`);
    console.log(`WS       ws://0.0.0.0:${PORT}/ws`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
