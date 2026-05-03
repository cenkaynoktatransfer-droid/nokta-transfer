import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 3000);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://localhost:${port}`);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const candidates = [
      pathname,
      `/dist${pathname}`,
      pathname.endsWith("/") ? `/dist${pathname}index.html` : `/dist${pathname}/index.html`
    ];

    for (const candidate of candidates) {
      const filePath = normalize(join(root, candidate));

      if (!filePath.startsWith(root)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      try {
        const body = await readFile(filePath);
        response.writeHead(200, {
          "content-type": types[extname(filePath)] || "application/octet-stream"
        });
        response.end(body);
        return;
      } catch {
        // Try the next candidate path.
      }
    }
    throw new Error("Not found");
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => {
  console.log(`Nokta Transfer running at http://localhost:${port}`);
});
