import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../dist", import.meta.url)));
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    if (pathname !== "/nocte/" && !pathname.startsWith("/nocte/")) {
      response.writeHead(404).end("Not found");
      return;
    }

    const relativePath = pathname === "/nocte/" ? "index.html" : pathname.slice("/nocte/".length);
    const filePath = resolve(root, relativePath);
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
      response.writeHead(400).end("Bad path");
      return;
    }
    if (!(await stat(filePath)).isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
    });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(4174, "127.0.0.1");
