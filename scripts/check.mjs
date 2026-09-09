import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { Script } from 'node:vm';

async function checkScripts(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await checkScripts(path);
    else if (path.endsWith('.js')) new Script(await readFile(path, 'utf8'), { filename: path });
  }
}
await checkScripts('src');
await checkScripts('config');
const html = await readFile('index.html', 'utf8');
for (const [, path] of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) {
  await access(path);
}
if (/<script\s*>/.test(html) || /<style\s*>/.test(html)) {
  throw new Error('Keep application scripts and styles in their dedicated files.');
}
console.log('JavaScript syntax and local asset references passed.');
