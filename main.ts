// EMBERWATCH: Night Shift — main.ts
// Program hand-in: salin game/ + screenshots/ dari repo ke direktori output,
// lalu tulis dossier.json memakai buildDossier dari vendor/makefun-game.ts.
// Node 22 stdlib saja. Deterministik: dua kali jalan menulis byte yang sama.
//
// ATURAN KERAS: jangan pernah menghapus direktori output itu sendiri
// (grader melakukan bind-mount ke sana). Pola yang dipakai: buat direktori
// output kalau belum ada, baca daftar isinya, hapus HANYA tiap isi di
// dalamnya satu per satu, lalu salin game/ + screenshots/ dan tulis dossier.

import { buildDossier } from './vendor/makefun-game.ts';
import {
  mkdirSync, readdirSync, rmSync, cpSync, writeFileSync, existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// Hapus isi direktori output satu per satu — TIDAK PERNAH direktori itu sendiri.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

const gameSrc = join(repoRoot, 'game');
const shotsSrc = join(repoRoot, 'screenshots');
if (!existsSync(gameSrc)) throw new Error('main.ts: game/ tidak ditemukan di ' + repoRoot);
if (!existsSync(shotsSrc)) throw new Error('main.ts: screenshots/ tidak ditemukan di ' + repoRoot);

cpSync(gameSrc, join(outDir, 'game'), { recursive: true });
cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('wrote ' + join(outDir, 'dossier.json') + ' (' + dossier.length + ' bytes)');
