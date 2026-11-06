import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const configPath = join(root, "lib/server/config.ts");

function sourceFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [child] : [];
  });
}

describe("server-only configuration boundary", () => {
  it("uses the production server-only marker as a direct dependency", () => {
    const configSource = readFileSync(configPath, "utf8");
    const packageJson = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };

    expect(configSource.startsWith('import "server-only";')).toBe(true);
    expect(packageJson.dependencies?.["server-only"]).toBe("^0.0.1");
  });

  it("has no Client Component that imports the secret configuration module", () => {
    const clientImporters = sourceFiles(join(root, "app"))
      .concat(sourceFiles(join(root, "lib")))
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        const isClientComponent = /^\s*["']use client["'];/m.test(source);
        const importsServerConfig = /(?:from\s*|import\s*)["'][^"']*server\/config["']/.test(
          source,
        );
        return isClientComponent && importsServerConfig;
      });

    expect(clientImporters).toEqual([]);
  });

  it("keeps secret-free verifier constants outside the secret config module", () => {
    const verifierSource = readFileSync(
      join(root, "lib/server/zero-g-transcription-verifier.ts"),
      "utf8",
    );

    expect(verifierSource).toContain('from "../inference-models"');
    expect(verifierSource).not.toMatch(/from\s+["'].+\/config["']/);
  });
});
