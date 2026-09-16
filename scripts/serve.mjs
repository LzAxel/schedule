import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isPreview = process.argv[2] === "dist";
const folder = isPreview ? join(root, "dist") : root;
const port = Number(process.env.PORT || 5173);
const host = "127.0.0.1";
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/schedule.js", ["schedule.js", "text/javascript; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/site.js", ["site.js", "text/javascript; charset=utf-8"]],
  ["/icons.svg", ["icons.svg", "image/svg+xml"]]
]);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT должен быть числом от 1 до 65535");
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  const pathname = new URL(request.url, `http://${host}`).pathname;
  const asset = files.get(pathname);
  if (!asset) {
    response.writeHead(404).end("Не найдено");
    return;
  }

  try {
    const source = await readFile(join(folder, asset[0]));
    const useGzip = /\bgzip\b/.test(request.headers["accept-encoding"] || "");
    const body = useGzip ? gzipSync(source, { level: 9 }) : source;
    response.writeHead(200, {
      "Content-Type": asset[1],
      "Content-Length": body.length,
      "Cache-Control": "no-store",
      Vary: "Accept-Encoding",
      ...(useGzip ? { "Content-Encoding": "gzip" } : {})
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500).end(
      error.code === "ENOENT" && isPreview
        ? "Сначала выполните npm run build"
        : "Не удалось открыть файл"
    );
  }
});

server.listen(port, host, () => {
  console.log(`${isPreview ? "Готовая сборка" : "Локальный сайт"}: http://${host}:${port}`);
});
