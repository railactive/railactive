import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = resolve(process.env.DOCS_SITE_DIR || join(rootDir, '..', 'docs', '_site'));
const targetDir = join(rootDir, 'dist', 'docs');

if (!existsSync(sourceDir)) {
  console.log(`[sync-docs] Sibling docs site not found at ${sourceDir}; skipping.`);
  process.exit(0);
}

rmSync(targetDir, { recursive: true, force: true });
cpSync(sourceDir, targetDir, { recursive: true });

// Keep dev docs deploy clean (HTML site only; strip search.json and review exports)
for (const entry of readdirSync(targetDir)) {
  if (entry === 'search.json' || /\.(docx|pdf)$/i.test(entry)) {
    rmSync(join(targetDir, entry), { force: true });
  }
}

console.log(`[sync-docs] Synced ${sourceDir} -> ${targetDir}`);
