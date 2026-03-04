import { join } from "path";

const DOCS_DIR = join(import.meta.dir, "..", "docs");
const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

const server = Bun.serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(DOCS_DIR, pathname);
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }
    const ext = pathname.slice(pathname.lastIndexOf("."));
    return new Response(file, {
      headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" },
    });
  },
});

console.log(`Docs server running at http://localhost:${server.port}`);
