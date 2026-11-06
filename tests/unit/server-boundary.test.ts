import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const credentialModulePaths = [
  "lib/server/config.ts",
  "lib/server/zero-g-adapter.ts",
  "lib/server/plan-orchestrator.ts",
];

function sourceFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [child] : [];
  });
}

describe("server-only configuration boundary", () => {
  it("uses the production server-only marker directly in every credential module", () => {
    const packageJson = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };

    for (const path of credentialModulePaths) {
      expect(readFileSync(join(root, path), "utf8").startsWith('import "server-only";')).toBe(
        true,
      );
    }
    expect(packageJson.dependencies?.["server-only"]).toBe("^0.0.1");
  });

  it("keeps the server-only alias isolated to Vitest", () => {
    const vitestSource = readFileSync(join(root, "vitest.config.ts"), "utf8");
    const tsconfigSource = readFileSync(join(root, "tsconfig.json"), "utf8");

    expect(vitestSource).toContain('"server-only": fileURLToPath(');
    expect(vitestSource).toContain('new URL("./tests/stubs/server-only.ts"');
    expect(tsconfigSource).not.toContain("server-only");
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

  it("keeps CLI verifiers independent of credential modules", () => {
    for (const file of [
      "lib/server/zero-g-transcription-verifier.ts",
      "lib/server/zero-g-planner-verifier.ts",
    ]) {
      const verifierSource = readFileSync(join(root, file), "utf8");
      expect(verifierSource).toContain('from "../zero-g-contract"');
      expect(verifierSource).not.toMatch(
        /from\s+["'].+\/(?:config|zero-g-adapter|plan-orchestrator)["']/,
      );
    }
  });
});
