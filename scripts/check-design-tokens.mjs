import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const failures = [];
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await scan(file); continue; }
    if (!/\.(css|jsx|js)$/.test(file) || file.endsWith('variables.css') || file.includes(`themes${path.sep}`)) continue;
    const source = await readFile(file, 'utf8');
    source.split('\n').forEach((line, i) => {
      if (/#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i.test(line)) failures.push(`${file}:${i + 1}: raw color`);
      if (file.endsWith('.css') && /\b\d+(?:\.\d+)?(?:px|rem|em)\b/.test(line) && !line.includes('@media (min-width: 768px)')) failures.push(`${file}:${i + 1}: raw size`);
      const font = line.match(/font-family\s*:\s*([^;]+)/i);
      if (file.endsWith('.css') && font && !font[1].trim().startsWith('var(')) failures.push(`${file}:${i + 1}: raw font`);
    });
  }
}
await scan('src');
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Design token check passed.');

