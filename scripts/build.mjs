import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");
const budget = 14_000;

await rm(output, { recursive: true, force: true });
await mkdir(output);

const [javascript, stylesheet, sourceHtml, sourceIcons] = await Promise.all([
  build({
    stdin: {
      contents: 'import "./schedule.js"; import "./app.js";',
      resolveDir: root,
      sourcefile: "site-entry.js",
      loader: "js"
    },
    bundle: true,
    minify: true,
    charset: "utf8",
    format: "iife",
    target: "es2022",
    legalComments: "none",
    outfile: join(output, "site.js"),
    write: false
  }),
  build({
    entryPoints: [join(root, "styles.css")],
    bundle: true,
    minify: true,
    charset: "utf8",
    legalComments: "none",
    outfile: join(output, "styles.css"),
    write: false
  }),
  readFile(join(root, "index.html"), "utf8"),
  readFile(join(root, "icons.svg"), "utf8")
]);

const scripts = /<script src="schedule\.js" defer><\/script>\s*<script src="app\.js" defer><\/script>/;
if (!scripts.test(sourceHtml)) throw new Error("Не найдены исходные скрипты в index.html");
const html = sourceHtml
  .replace(scripts, '<script src="site.js" defer></script>')
  .replace(/>\s+</g, "><")
  .trim();
const icons = sourceIcons.replace(/>\s+</g, "><").trim();
const files = new Map([
  ["index.html", Buffer.from(html)],
  ["styles.css", stylesheet.outputFiles[0].contents],
  ["site.js", javascript.outputFiles[0].contents],
  ["icons.svg", Buffer.from(icons)]
]);

await Promise.all([...files].map(([name, content]) => writeFile(join(output, name), content)));

const rawBytes = [...files.values()].reduce((sum, content) => sum + content.length, 0);
const gzipBytes = [...files.values()].reduce((sum, content) => sum + gzipSync(content, { level: 9 }).length, 0);
console.log(`Сборка: ${rawBytes} Б без сжатия, ${gzipBytes} Б gzip (лимит ${budget} Б)`);
if (gzipBytes > budget) throw new Error("Сборка превышает лимит 14 КБ при передаче с gzip");
