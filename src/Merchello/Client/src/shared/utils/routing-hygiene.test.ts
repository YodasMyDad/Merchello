// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const clientSourceRoot = join(currentDir, "../..");

const forbiddenWorkspaceHrefPattern = /href\s*=\s*["'`]\/section\/merchello\/workspace/;
const rowClickBindingPattern = /@click=\$\{[\s\S]*?_handleRowClick\(/;
const anchorMarkupPattern = /<a\s/i;
const anchorGuardPattern = /\b_isAnchorClick\s*\(/;

function getTypeScriptFiles(dirPath: string): string[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules") {
        continue;
      }

      files.push(...getTypeScriptFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && absolutePath.endsWith(".ts")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function toClientRelativePath(absolutePath: string): string {
  return relative(clientSourceRoot, absolutePath).replace(/\\/g, "/");
}

describe("routing hygiene", () => {
  it("does not contain hardcoded absolute Merchello workspace hrefs", () => {
    const files = getTypeScriptFiles(clientSourceRoot);
    const violations = files
      .filter((filePath) => forbiddenWorkspaceHrefPattern.test(readFileSync(filePath, "utf8")))
      .map(toClientRelativePath);

    expect(
      violations,
      `Found hardcoded absolute Merchello workspace hrefs:\n${violations.join("\n")}`
    ).toEqual([]);
  });

  it("requires anchor guards when row-click handlers and anchors are both present", () => {
    const files = getTypeScriptFiles(clientSourceRoot);
    const violations = files
      .filter((filePath) => {
        const source = readFileSync(filePath, "utf8");
        const hasAnchorMarkup = anchorMarkupPattern.test(source);
        const hasRowClickBinding = rowClickBindingPattern.test(source);
        const hasAnchorGuard = anchorGuardPattern.test(source);
        return hasAnchorMarkup && hasRowClickBinding && !hasAnchorGuard;
      })
      .map(toClientRelativePath);

    expect(
      violations,
      `Files with anchors and row-click handlers must implement _isAnchorClick:\n${violations.join("\n")}`
    ).toEqual([]);
  });
});
