// main.ts — hand-in program: copies game/ and screenshots/ into the
// output directory and writes dossier.json with buildDossier.
// Never deletes the output directory itself (the grader bind-mounts it):
// only its contents are removed, one entry at a time.

import { buildDossier } from './vendor/makefun-game.ts';
import {
  mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function clearContents(dir: string): void {
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function copyTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) {
      writeFileSync(to, readFileSync(from));
    }
  }
}

mkdirSync(outDir, { recursive: true });
clearContents(outDir);
copyTree('game', join(outDir, 'game'));
copyTree('screenshots', join(outDir, 'screenshots'));
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
