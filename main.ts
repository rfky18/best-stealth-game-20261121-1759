// main.ts — hand-in program: copies game/ and screenshots/ into the
// output directory and writes dossier.json with buildDossier.
// Never deletes the output directory itself (the grader bind-mounts it):
// only its contents are removed, one entry at a time.
//
// PATH RULE (fix, ditegaskan sesi ini): semua path sumber diturunkan dari
// lokasi main.ts sendiri via import.meta.url — TIDAK PERNAH dari cwd dan
// TIDAK PERNAH dari path relatif. Grader menjalankan `node /bot/main.ts`
// dengan cwd di luar /bot; path relatif 'game'/'screenshots' di sana
// menghasilkan ENOENT dan grading REJECTED (run_completes exit 1, v5
// pertama). import.meta.url menunjuk file ini apa pun cwd-nya, jadi
// repoRoot selalu benar selama game/ + screenshots/ berdampingan dengan
// main.ts di repo yang sama.

import { buildDossier } from './vendor/makefun-game.ts';
import {
  mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
// repoRoot = direktori yang memuat main.ts ini, diturunkan dari
// import.meta.url (bukan process.cwd()). Semua copy di bawah memakai
// join(repoRoot, ...) sehingga grader cwd-agnostic.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

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
// Copy dari repoRoot (lokasi main.ts), bukan cwd: grader bisa jalan dari
// direktori mana pun dan copy tetap menemukan game/ + screenshots/.
copyTree(join(repoRoot, 'game'), join(outDir, 'game'));
copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
