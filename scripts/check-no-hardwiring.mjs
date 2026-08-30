#!/usr/bin/env node
// Enforces this platform's actual architecture rule as an automated check,
// not just a habit: no route may special-case one tenant, no URL may be
// hardcoded outside db.js/config, and Apps/Connectors must stay two
// systems that never import from each other. Idea pulled from
// cybercheck-web/scripts/check-no-hardwiring.mjs — same technique, this
// platform's own vocabulary.
//
// Run with: node scripts/check-no-hardwiring.mjs
// Exits non-zero (fails CI) on any violation.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const SKIP_DIRS = new Set(['node_modules', '.git', 'scripts']);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (extname(full) === '.js') out.push(full);
  }
  return out;
}

const RULES = [
  {
    name: 'no hardcoded tenant slug/id comparison',
    // e.g. tenantSlug === 'beachside-circle-boats' — a real tenant's identity
    // should never appear as a code branch.
    re: /(tenant(_id|Id|Slug)|entity_slug)\s*[=!]==?\s*['"`][a-z0-9-]{3,}['"`]/,
    why: 'A route must never branch on one specific tenant. If a tenant needs special behavior, that belongs in data (tenant_apps, tenant_profiles), not in an if-statement.',
  },
  {
    name: 'no hardcoded external URL outside db.js',
    re: /https?:\/\/(?!localhost)[a-z0-9.-]+\.[a-z]{2,}/i,
    exclude: ['db.js', 'README.md'],
    why: 'External URLs belong in .env, not in source — this repo runs the same code for every deployment.',
  },
  {
    name: 'routes/apps.js or routes/apps/** must not import routes/connectors.js',
    re: /require\(['"`].*connectors['"`]\)/,
    onlyIn: ['routes/apps.js', 'routes/apps/'],
    why: 'Apps and Connectors are required to be independent systems — see README.md. A route/apps file importing anything connector-shaped breaks that guarantee.',
  },
  {
    name: 'routes/connectors.js must not import routes/apps.js',
    re: /require\(['"`].*[/'"`]apps(\.js)?['"`]\)/,
    onlyIn: ['routes/connectors.js'],
    why: 'Same rule, the other direction.',
  },
];

let violations = 0;
for (const file of walk(ROOT)) {
  const rel = file.replace(ROOT, '');
  const content = readFileSync(file, 'utf8');
  for (const rule of RULES) {
    if (rule.onlyIn && !rule.onlyIn.some((p) => rel.includes(p))) continue;
    if (rule.exclude && rule.exclude.some((p) => rel.includes(p))) continue;
    const match = content.match(rule.re);
    if (match) {
      console.error(`\n✗ ${rule.name}\n  ${rel}: "${match[0]}"\n  why: ${rule.why}`);
      violations++;
    }
  }
}

if (violations) {
  console.error(`\n${violations} violation(s) found.`);
  process.exit(1);
}
console.log('No hardwiring violations found.');
