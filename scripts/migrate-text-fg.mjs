import fs from 'fs';
import path from 'path';

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory() && !['node_modules', '.next'].includes(e.name)) walk(p, a);
    else if (/\.(tsx|ts)$/.test(e.name)) a.push(p);
  }
  return a;
}

const files = [...walk('app'), ...walk('components')];
let n = 0;
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const o = s;
  s = s.replace(/(^|[\s"'`])text-white\b/g, '$1text-fg');
  s = s.replace(/from-emerald-500([^"]*)text-fg/g, 'from-emerald-500$1text-on-brand');
  s = s.replace(/bg-emerald-500([^"]*)text-fg/g, 'bg-emerald-500$1text-on-brand');
  s = s.replace(/bg-emerald-600([^"]*)text-fg/g, 'bg-emerald-600$1text-on-brand');
  s = s.replace(/to-teal-500([^"]*)text-fg/g, 'to-teal-500$1text-on-brand');
  s = s.replace(/to-teal-600([^"]*)text-fg/g, 'to-teal-600$1text-on-brand');
  if (s !== o) {
    fs.writeFileSync(f, s);
    n++;
    console.log(f);
  }
}
console.log('changed', n);
