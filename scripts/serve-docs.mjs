import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const DOCS_DIR = join(import.meta.dirname, "..", "docs");
const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(DOCS_DIR, pathname);
  try {
    const data = await readFile(filePath);
    const ext = extname(pathname);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Docs server running at http://localhost:${PORT}`);
});
