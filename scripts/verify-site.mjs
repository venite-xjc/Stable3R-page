import assert from 'node:assert/strict';
import {readFileSync, readdirSync, lstatSync, existsSync} from 'node:fs';
import {resolve, dirname, relative, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const sha = file => createHash('sha256').update(readFileSync(join(root, file))).digest('hex');
const data = json('assets/paper/results.json');
const media = json('assets/media-manifest.json');
const html = read('index.html');
assert(existsSync(join(root, '.nojekyll')));
assert.equal(html.match(/<img\b/g).length, 5);
assert.equal(html.match(/<canvas\b/g).length, 3);
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const ref = match[1];
  if (ref.startsWith('#')) {
    assert(html.includes(`id="${ref.slice(1)}"`), `Broken anchor ${ref}`);
    continue;
  }
  assert(!/^(?:\/|[a-z]+:)/i.test(ref), `Non-relative asset ${ref}`);
  assert(existsSync(join(root, ref)), `Missing asset ${ref}`);
}
for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
  for (const item of match[1].split(',')) assert(existsSync(join(root, item.trim().split(/\s+/)[0])));
}
const rows = Object.values(data.reconstruction).flatMap(setting => setting.rows).concat(data.pose.rows);
assert.equal(rows.flatMap(row => row.values).length, 333);
assert(rows.every(row => row.values.every(value => /^\d+\.\d{3}$/.test(value))));
assert.deepEqual(data.pose.datasets, ['Sintel', 'TUM-dynamics', 'ScanNet']);
assert.deepEqual(data.pose.rows.at(-1).values.slice(0, 6), ['0.116','0.054','0.425','0.017','0.009','0.304']);
assert(html.includes('<select id="pose-dataset"><option>Sintel</option><option>TUM-dynamics</option><option>ScanNet</option></select>'));
assert(html.includes('Sintel camera pose results from the manuscript'));
const longRows = data.reconstruction.long.rows;
assert.deepEqual(longRows.find(row => row.method === 'LingBot-Map').values.slice(-2), ['0.618','0.693']);
assert.equal(longRows.find(row => row.paper_method === 'Ours').method, 'Stable3R (w/ FrameVGGT*)');
assert(!read('app.js').includes('FERM'));
assert.equal(data.publication_corrections.length, 3);
assert.deepEqual(data.publication_corrections, media.tables.publication_corrections);
assert.equal(media.tables.numeric_values, 333);
assert.deepEqual(JSON.parse(read('assets/paper/results-data.js').replace(/^window.STABLE3R_PAPER_RESULTS = /, '').trim().replace(/;$/, '')), data);
for (const figure of media.figures) assert.equal(sha(`assets/paper/${figure.asset}.webp`), figure.webp_sha256);
for (const file of ['app.js','clouds.js']) assert(!/requestAnimationFrame|setInterval\s*\(|setTimeout\s*\(/.test(read(file)));

const clouds = json('assets/clouds/manifest.json');
assert.equal(clouds.status, 'PASS');
assert.equal(clouds.scenes.length, 3);
assert.equal(clouds.auto_rotation, false);
assert.deepEqual(JSON.parse(read('assets/clouds/manifest.js').replace(/^window.STABLE3R_CLOUD_MANIFEST = /, '').trim().replace(/;$/, '')), clouds);
for (const scene of clouds.scenes) {
  assert.equal(sha(`assets/clouds/${scene.asset}`), scene.asset_sha256);
  assert(scene.same_gt_mask && scene.rgb_canonical_max_abs <= 1e-6 && scene.gt_max_abs <= 1e-6);
  const payload = JSON.parse(read(`assets/clouds/${scene.asset}`).replace(/^window.STABLE3R_CLOUD_DATA = /, '').trim().replace(/;$/, ''));
  assert.equal(payload.count, scene.display.point_count);
  assert.equal(Buffer.from(payload.colors, 'base64').length, payload.count * 3);
  for (const [name, cloud] of Object.entries(payload.clouds)) {
    const points = Buffer.from(cloud.positions, 'base64');
    assert.equal(points.length, payload.count * 12);
    for (let i=0; i<points.length; i+=4) assert(Number.isFinite(points.readFloatLE(i)));
    if (name === 'gt') continue;
    const file = `assets/clouds/metrics-${name}-${scene.id}.json`;
    assert.equal(sha(file), scene.source_identities[name].metrics_sha256);
    assert.deepEqual(json(file).metrics, scene.metrics[name]);
  }
}
function inspect(dir) {
  for (const name of readdirSync(dir)) {
    if (name === '.git') continue;
    const file = join(dir, name), stat = lstatSync(file);
    assert(!stat.isSymbolicLink(), `Symbolic link in release: ${relative(root,file)}`);
    assert(!/^(?:\.env|source-.*\.tex$)/.test(name), `Private source file in release: ${name}`);
    assert(!/\.(?:pth|safetensors|zip|tar|gz)$/.test(name), `Non-website file in release: ${name}`);
    if (stat.isDirectory()) inspect(file);
  }
}
inspect(root);
console.log(JSON.stringify({status:'PASS',numericValues:333,corrections:3,figures:5,pointCloudScenes:3,relativeAssets:true,rawCloudMetricsUnchanged:true}));
