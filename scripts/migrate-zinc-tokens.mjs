import fs from 'fs';
import path from 'path';

const roots = ['app', 'components'];
const exts = new Set(['.tsx', '.ts']);
const files = [];

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.has(path.extname(e.name))) files.push(p);
  }
}
roots.forEach(walk);

/** Longer / more specific patterns first */
const reps = [
  [/bg-\[\#050505\]/g, 'bg-surface'],
  [/bg-zinc-950\/95/g, 'bg-elevated/95'],
  [/bg-zinc-950\/90/g, 'bg-elevated/90'],
  [/bg-zinc-950\/80/g, 'bg-elevated/80'],
  [/bg-zinc-950\/60/g, 'bg-elevated/60'],
  [/bg-zinc-950\/55/g, 'bg-elevated/55'],
  [/bg-zinc-950\/50/g, 'bg-elevated/50'],
  [/bg-zinc-950\/40/g, 'bg-elevated/40'],
  [/bg-zinc-950\/30/g, 'bg-elevated/30'],
  [/bg-zinc-950\/20/g, 'bg-elevated/20'],
  [/bg-zinc-950\b/g, 'bg-elevated'],
  [/hover:bg-zinc-900\/40/g, 'hover:bg-muted/40'],
  [/hover:bg-zinc-900\/35/g, 'hover:bg-muted/35'],
  [/hover:bg-zinc-900\/30/g, 'hover:bg-muted/30'],
  [/hover:bg-zinc-900\b/g, 'hover:bg-muted'],
  [/bg-zinc-900\/80/g, 'bg-muted/80'],
  [/bg-zinc-900\/50/g, 'bg-muted/50'],
  [/bg-zinc-900\/40/g, 'bg-muted/40'],
  [/bg-zinc-900\/35/g, 'bg-muted/35'],
  [/bg-zinc-900\/30/g, 'bg-muted/30'],
  [/bg-zinc-900\/20/g, 'bg-muted/20'],
  [/bg-zinc-900\b/g, 'bg-muted'],
  [/hover:bg-zinc-800\b/g, 'hover:bg-subtle'],
  [/bg-zinc-800\b/g, 'bg-subtle'],
  [/border-zinc-900\/80/g, 'border-subtle/80'],
  [/border-zinc-900\/60/g, 'border-subtle/60'],
  [/border-zinc-900\b/g, 'border-subtle'],
  [/hover:border-zinc-800\b/g, 'hover:border-edge'],
  [/hover:border-zinc-700\b/g, 'hover:border-edge-strong'],
  [/border-zinc-800\/90/g, 'border-edge/90'],
  [/border-zinc-800\/80/g, 'border-edge/80'],
  [/border-zinc-800\b/g, 'border-edge'],
  [/border-zinc-700\b/g, 'border-edge-strong'],
  [/placeholder-zinc-600\b/g, 'placeholder:text-faint'],
  [/placeholder-zinc-500\b/g, 'placeholder:text-muted-fg'],
  [/text-zinc-600\b/g, 'text-faint'],
  [/text-zinc-500\b/g, 'text-muted-fg'],
  [/hover:text-zinc-300\b/g, 'hover:text-secondary-strong'],
  [/text-zinc-400\b/g, 'text-secondary'],
  [/text-zinc-300\b/g, 'text-secondary-strong'],
];

let changed = 0;
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  let n = s;
  for (const [re, to] of reps) n = n.replace(re, to);
  if (n !== s) {
    fs.writeFileSync(f, n);
    changed++;
    console.log('updated', f);
  }
}
console.log('files changed', changed);
