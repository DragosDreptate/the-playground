/**
 * Synchronise la version dans package.json et .release-please-manifest.json
 * à partir de la dernière entrée de CHANGELOG.md.
 *
 * Usage : pnpm version:sync
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = process.cwd();

function readChangelog(): string {
  return readFileSync(resolve(ROOT, "CHANGELOG.md"), "utf-8");
}

function extractLatestVersion(changelog: string): string {
  const match = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
  if (!match) throw new Error("Aucune version trouvée dans CHANGELOG.md");
  return match[1];
}

function updatePackageJson(version: string): boolean {
  const path = resolve(ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(path, "utf-8"));
  if (pkg.version === version) return false;
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
  return true;
}

function updateManifest(version: string): boolean {
  const path = resolve(ROOT, ".release-please-manifest.json");
  const manifest = JSON.parse(readFileSync(path, "utf-8"));
  if (manifest["."] === version) return false;
  manifest["."] = version;
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
  return true;
}

const version = extractLatestVersion(readChangelog());
const pkgChanged = updatePackageJson(version);
const manifestChanged = updateManifest(version);

if (pkgChanged || manifestChanged) {
  console.log(`✓ Version synchronisée : ${version}`);
} else {
  console.log(`✓ Déjà à jour : ${version}`);
}
