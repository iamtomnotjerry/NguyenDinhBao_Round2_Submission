/**
 * Load .env / .env.local into the Jest sandbox.
 *
 * Neither next/jest's env loading nor `process.loadEnvFile` reaches the
 * sandboxed `process.env` copy that Jest exposes to tests, so parse and
 * assign explicitly. Existing variables (real CI env) win over file values.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

for (const file of ['.env', '.env.local']) {
  const path = join(process.cwd(), file);
  if (!existsSync(path)) continue;

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match || line.trim().startsWith('#')) continue;

    const key = match[1];
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
