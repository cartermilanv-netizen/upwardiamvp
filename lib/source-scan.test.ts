import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["app", "components", "lib"];
const BANNED = [
  /console\.log/,
  /calfresh/i,
  /sttla/i,
  /tax[- ]prep/i,
  /upload your pay stub/i,
  /you qualify/i,
  /county dashboard/i,
  /written by upwardia/i,
];

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...sourceFiles(full));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry) || entry.endsWith(".test.ts")) continue;
    files.push(full);
  }
  return files;
}

describe("resident source", () => {
  it("does not log assessments or name deck programs", () => {
    const files = ROOTS.flatMap((root) => sourceFiles(path.join(process.cwd(), root)));
    expect(files.length).toBeGreaterThan(0);
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const pattern of BANNED) {
        if (pattern.test(text)) hits.push(`${file} matched ${pattern}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
