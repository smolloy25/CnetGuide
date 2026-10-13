import { cp, mkdir, rm } from 'node:fs/promises';
const files = ['index.html','styles.css','app.js','guide-data.js','guide-utils.js','video-data.js','sw.js','manifest.webmanifest','assets'];
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of files) await cp(file, `dist/${file}`, { recursive: true });
console.log('Built Vertage Cnet Manager Hub into dist/');
