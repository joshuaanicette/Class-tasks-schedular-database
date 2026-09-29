import { cp, mkdir, rm } from 'node:fs/promises';
import './check.mjs';

// Publish only runtime files, excluding tests, tooling, and repository metadata.
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const path of [
  'index.html',
  'assets',
  'config',
  'src',
  'firebase-messaging-sw.js',
  'manifest.webmanifest',
]) {
  await cp(path, `dist/${path}`, { recursive: true });
}
console.log('Built static site in dist/');
