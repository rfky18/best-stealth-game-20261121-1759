// Emberwatch: Night Shift — the hand-in program (Node 22, stdlib only).
//
// It copies this repo's game/ and screenshots/ into the output directory
// and writes /output/dossier.json, the summary the judge reads, using the
// vendored make.fun library. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (from the kit's gate). Only text_max_bytes shapes
// the bytes; the rest refuse an entry the scorer would refuse: more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or
// 48 MiB of game files in all; a path under game/ over 1000 bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
