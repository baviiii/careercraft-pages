import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(process.cwd(), "src");
const TARGET_DIRS = ["components", "pages", "features"].map((d) => path.join(ROOT, d));
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\s*\(/g;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      if (!CODE_EXT.has(path.extname(entry.name))) return [];
      return [full];
    }),
  );
  return files.flat();
}

function isAllowedLine(line) {
  return line.includes("data-allow-color-literal");
}

const offenders = [];
for (const dir of TARGET_DIRS) {
  const files = await walk(dir);
  for (const file of files) {
    const content = await readFile(file, "utf8");
    const lines = content.split("\n");
    lines.forEach((line, i) => {
      if (isAllowedLine(line)) return;
      if (COLOR_LITERAL.test(line)) {
        offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}`);
      }
      COLOR_LITERAL.lastIndex = 0;
    });
  }
}

if (offenders.length > 0) {
  console.error("Design token guardrail failed. Replace raw color literals with tokens.");
  offenders.slice(0, 80).forEach((o) => console.error(` - ${o}`));
  process.exit(1);
}

console.log("Design token guardrail passed.");
