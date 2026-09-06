import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const slugs = [
  "sql-injection",
  "path-traversal",
  "stored-xss",
  "command-injection",
  "idor",
  "open-redirect",
];
const base = process.env.VITE_BASE_PATH || "/";
if (
  !base.startsWith("/") ||
  !base.endsWith("/") ||
  base.includes("..") ||
  base.includes("//")
) {
  throw new Error(
    "VITE_BASE_PATH must be an absolute path with a trailing slash, e.g. /byte-breaker/",
  );
}

export default defineConfig({
  base,
  plugins: [react()],
  server: { hmr: false },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        ["index.html", ...slugs.map((slug) => `labs/${slug}/index.html`)].map(
          (path) => [path, fileURLToPath(new URL(path, import.meta.url))],
        ),
      ),
    },
  },
});
