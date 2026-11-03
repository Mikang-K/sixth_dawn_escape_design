import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const files = ['index.html', 'style.css', ...['content', 'model', 'pixel-art', 'scenes', 'widgets', 'main'].map(name => `src/${name}.js`)];
await mkdir('dist/src', { recursive: true });
const hashes = {};
for (const file of files) {
  if (file.endsWith('.js')) {
    const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (check.status !== 0) throw new Error(check.stderr || `Syntax check failed: ${file}`);
  }
  const content = await readFile(file);
  if (content.includes(Buffer.from([0xef, 0xbf, 0xbd]))) throw new Error(`Invalid replacement character: ${file}`);
  await copyFile(file, `dist/${file}`);
  hashes[file] = createHash('sha256').update(content).digest('hex');
}
const {version}=JSON.parse(await readFile('package.json','utf8'));
await writeFile('dist/build.json', JSON.stringify({ version, files: hashes }, null, 2));
console.log(`BUILD: ${files.length} browser assets checked and packaged in dist/`);
