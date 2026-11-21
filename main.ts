// Emberwatch: Night Shift — hand-in program.
// Copies game/ and screenshots/ into the output directory and writes
// dossier.json with buildDossier from the kit's vendor library.
// Node 22 standard library only. Deterministic: the same input always
// writes the same bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const OUTPUT = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const ROOT = fileURLToPath(new URL('.', import.meta.url));

function copyTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src).sort();
  for (const name of entries) {
    const from = join(src, name);
    const to = join(dest, name);
    const st = statSync(from);
    if (st.isDirectory()) {
      copyTree(from, to);
    } else if (st.isFile()) {
      cpSync(from, to);
    }
  }
}

function main(): void {
  const out = resolve(OUTPUT);
  mkdirSync(out, { recursive: true });
  // Clear previous contents WITHOUT removing the directory itself: the
  // grader bind-mounts the output dir, and removing a mount point fails
  // (rmSync on it throws and the run exits 1 — reproduced locally).
  for (const name of readdirSync(out)) {
    rmSync(join(out, name), { recursive: true, force: true });
  }
  const gameSrc = join(ROOT, 'game');
  const shotsSrc = join(ROOT, 'screenshots');
  if (!existsSync(gameSrc)) throw new Error('game/ is missing from the repository');
  copyTree(gameSrc, join(out, 'game'));
  if (existsSync(shotsSrc)) copyTree(shotsSrc, join(out, 'screenshots'));
  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log(`wrote ${out} (dossier ${dossier.length} bytes)`);
}

main();
