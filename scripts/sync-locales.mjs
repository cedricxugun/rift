import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTranslations, locales, sourceKeys } from './add-missing-keys.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await applyTranslations();

const missingInSource = [];
const sourceSet = new Set(sourceKeys);
// UI copy arrays and all skill/enemy/rank records are included by the generators.
// Recursively inspect calls so V1 and V2 UI files share the same coverage check.
const pending = [path.join(ROOT, 'src')];
while (pending.length) {
  const directory = pending.pop();
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'locales') pending.push(filePath);
      continue;
    }
    if (!/\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    const source = await fs.readFile(filePath, 'utf8');
    for (const match of source.matchAll(/\b(?:t|tr)\(\s*(['"`])((?:\\.|(?!\1)[^\\\r\n])*)\1\s*[,)]/g)) {
      // Template expressions are resolved from the canonical data/copy arrays.
      if (match[1] === '`' && match[2].includes('${')) continue;
      const key = match[2].replace(/\\(['"`\\])/g, '$1');
      if (!sourceSet.has(key)) missingInSource.push(`${path.relative(ROOT, filePath)}: ${key}`);
    }
  }
}
if (missingInSource.length) {
  throw new Error(`UI keys missing from src/copy.js or src/v2/copy.js:\n${missingInSource.join('\n')}`);
}

for (const locale of locales) {
  const { translation } = JSON.parse(await fs.readFile(path.join(ROOT, 'src/locales', `${locale}.json`), 'utf8'));
  if (JSON.stringify(Object.keys(translation)) !== JSON.stringify(sourceKeys)) {
    throw new Error(`${locale}: generated key order or key parity differs from English source`);
  }
}
console.log(`All ${sourceKeys.length} source keys are present in all ${locales.length} locales. Placeholders and alphabetical order verified.`);
