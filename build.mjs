import { cp, mkdir, rm } from "node:fs/promises";

const files = [
  "index.html",
  "ilceler.html",
  "styles.css",
  "script.js",
  "robots.txt",
  "sitemap.xml",
  "assets"
];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const file of files) {
  await cp(file, `dist/${file}`, { recursive: true });
}
