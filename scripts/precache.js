// After `expo export -p web`: writes this build's file list and version into dist/sw.js,
// so the service worker downloads every route chunk up front (offline works on every tab).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const dist = path.resolve(process.argv[2] || 'dist');
const skip = new Set(['/sw.js', '/_headers', '/metadata.json', '/index.html']);
const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else files.push('/' + path.relative(dist, full).split(path.sep).join('/'));
  }
})(dist);
const list = files.filter((f) => !skip.has(f)).sort();

const hash = crypto.createHash('sha256');
for (const f of [...list, '/index.html']) hash.update(f).update(fs.readFileSync(path.join(dist, f)));
const version = hash.digest('hex').slice(0, 12);

const swPath = path.join(dist, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
const marker = "const BUILD = { version: 'dev', files: [] };";
if (!sw.includes(marker)) throw new Error('sw.js: BUILD marker not found');
fs.writeFileSync(swPath, sw.replace(marker, `const BUILD = ${JSON.stringify({ version, files: list })};`));
console.log(`sw.js: ${list.length} files precached, version ${version}`);
