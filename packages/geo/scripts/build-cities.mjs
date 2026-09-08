#!/usr/bin/env node
// Build src/data/cities.json from a GeoNames cities15000.txt dump.
// Usage: node scripts/build-cities.mjs path/to/cities15000.txt
// Keeps every Turkish entry and every city with population >= 100 000
// elsewhere. Output is sorted by population (desc) then id, and written
// with a fixed JSON layout so reruns are byte-identical.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_WORLD_POPULATION = 100_000;
const HOME_COUNTRY = 'TR';
// GeoNames' primary name is the ASCII form for a few Turkish cities; the
// Turkish UI should show the local spelling.
const NAME_OVERRIDES = new Map([[745044, 'İstanbul']]);

const source = process.argv[2];
if (!source) {
  console.error('usage: build-cities.mjs <cities15000.txt>');
  process.exit(1);
}

const out = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/data/cities.json',
);
const lines = readFileSync(source, 'utf8').split('\n').filter(Boolean);

const cities = [];
for (const line of lines) {
  const f = line.split('\t');
  const id = Number(f[0]);
  const country = f[8];
  const population = Number(f[14]);
  const timeZone = f[17];
  if (!timeZone) continue;
  if (country !== HOME_COUNTRY && population < MIN_WORLD_POPULATION) continue;
  cities.push({
    id,
    name: NAME_OVERRIDES.get(id) ?? f[1],
    ascii: f[2],
    country,
    // 4 decimals ≈ 11 m, plenty for a birth chart; keeps the asset small.
    latitude: Number(Number(f[4]).toFixed(4)),
    longitude: Number(Number(f[5]).toFixed(4)),
    population,
    timeZone,
  });
}
cities.sort((a, b) => b.population - a.population || a.id - b.id);

const body = cities.map((c) => JSON.stringify(c)).join(',\n  ');
writeFileSync(out, `[\n  ${body}\n]\n`);
console.log(`wrote ${cities.length} cities to ${out}`);
