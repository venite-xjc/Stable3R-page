import assert from 'node:assert/strict';
import {readFileSync, readdirSync, lstatSync, existsSync} from 'node:fs';
import {resolve, dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {verifyCloudAssets} from './verify-clouds.mjs';

const root = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));
const identities = JSON.parse(readFileSync(new URL('./content-identities.json', import.meta.url), 'utf8'));
const read = file => readFileSync(join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const html = read('index.html');
const data = json('assets/paper/results.json');
const media = json('assets/media-manifest.json');
const clouds = json('assets/clouds/manifest.json');
assert(existsSync(join(root, '.nojekyll')));
assert.equal((html.match(/<h1>/g) || []).length, 1);
assert.equal((html.match(/<img\b/g) || []).length, 5);
assert.equal((html.match(/<canvas\b/g) || []).length, 3);
assert.equal((html.match(/<video\b/g) || []).length, 2);
assert(!/<iframe\b/.test(html));
for (const [, attrs] of html.matchAll(/<video\b([^>]*)>/g)) {
  assert(/\bcontrols\b/.test(attrs) && /\bplaysinline\b/.test(attrs));
  assert(attrs.includes('preload="auto"'));
  assert(/\bautoplay\b/.test(attrs) && /\bmuted\b/.test(attrs) && /\bloop\b/.test(attrs), 'Method videos should autoplay silently and loop');
}
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML ID');
for (const [,tag,attrs] of html.matchAll(/<(\w+)\b([^>]*?)>/g)) {
  for (const [,kind,ref] of attrs.matchAll(/\b(src|href)="([^"]+)"/g)) {
    if (/^https:\/\//.test(ref)) {
      if (tag === 'link' && /\brel="canonical"/.test(attrs)) {
        assert.equal(ref, 'https://venite-xjc.github.io/Stable3R-page/');
        continue;
      }
      assert.equal(tag, 'a', 'External dependency');
      assert.equal(kind, 'href');
    } else if (ref.startsWith('#')) assert(ids.includes(ref.slice(1)), `Broken anchor ${ref}`);
    else assert(existsSync(join(root,ref.split(/[?#]/)[0])), `Missing local file ${ref}`);
  }
  const poster = attrs.match(/\bposter="([^"]+)"/);
  if (poster) assert(existsSync(join(root,poster[1])), `Missing video poster ${poster[1]}`);
}
for (const [,srcset] of html.matchAll(/srcset="([^"]+)"/g)) {
  for (const src of srcset.split(',')) assert(existsSync(join(root,src.trim().split(/\s+/)[0])));
}
assert(html.includes('id="section-nav"'));
assert(html.includes('class="sidebar"'));
assert(!html.includes('floating-toc'));
assert(!html.includes('Oral'));
assert(html.includes('<h2 id="abstract-title">Abstract</h2>'));
assert(!html.includes('<summary>Abstract</summary>'));
assert(!html.includes('TL;DR') && !html.includes('summary-note'));
assert(!html.includes('Details &amp; sources') && !html.includes('Protocol &amp; metrics'));
assert(!html.includes('class="cloud-protocol"') && !html.includes('result-details'));
assert(html.includes('id="cloud-sampling-note" hidden'));
assert(html.includes('id="reconstruction-source"') && html.includes('id="reconstruction-note"'));
const headings = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map(match => match[1]);
assert.deepEqual(headings, ['Abstract','Analysis','Method','3D comparison','Results','Citation']);
const nav = [...html.matchAll(/<a href="#(abstract|analysis|method|clouds|results|citation)"(?: aria-current="location")?>/g)].map(match => match[1]);
assert.deepEqual(nav, ['abstract','analysis','method','clouds','results','citation']);
assert(html.includes('Jincheng Xiong</a><sup>1,2,*</sup>'));
assert(html.includes('Jiarong Han<sup>2,*</sup>'));
assert(html.includes('Equal contribution'));
assert(html.includes('AMAP, Alibaba') && !html.includes('AMAP CVLab'));
assert(html.indexOf('id="analysis"') < html.indexOf('assets/paper/probe.webp'));
assert(html.indexOf('assets/paper/probe.webp') < html.indexOf('id="method"'));
assert.equal((html.match(/class="resource-button" type="button" disabled/g) || []).length, 3);
assert(html.includes('Ming Qian</a><sup>2,†</sup>'));
assert(html.includes('NeurIPS 2026'));
assert(!html.includes('href="assets/favicon.svg"'), 'Legacy blue S favicon must not be displayed');
assert(html.includes('assets/icons/stable3r-mark.svg?v=20261123-copper'));
const favicon = readFileSync(join(root,'assets/icons/stable3r-mark-32.png'));
assert.equal(favicon.readUInt32BE(16),32);
assert.equal(favicon.readUInt32BE(20),32);
assert(html.includes('id="copy-citation"'));
assert(html.includes('Layout inspired by'));
const footer=html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)[1];
assert.equal(footer.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),'Layout inspired by GLD');
assert.equal((footer.match(/<a\b/g)||[]).length,1);
assert(footer.includes('href="https://cvlab-kaist.github.io/GLD/"'));
assert(existsSync(join(root,'assets/icons/neurips-logo.svg')));
const videoInfo = json('assets/videos/video-info.json');
const videoManifest = json('assets/videos/manifest.json');
assert.equal(videoInfo.length,2);
assert.deepEqual(videoInfo,videoManifest.videos);
for (const video of videoInfo) {
  assert(video.width > 0 && video.height > 0 && video.duration_seconds > 0);
  assert(video.codecs.includes('avc1'), 'Expected browser-compatible H.264 video');
  assert(existsSync(join(root,'assets/videos',video.asset)));
  assert(html.includes(`src="assets/videos/${video.asset}"`));
  assert.equal(sha(join(root,'assets/videos',video.asset)),video.sha256);
  assert.equal(sha(join(root,'assets/videos',video.poster)),video.poster_sha256);
  assert.equal(video.frame_count,video.source_frame_count);
  assert.equal(video.width,video.source_width);
  assert.equal(video.crop.x,0);
  assert(video.height<video.source_height && video.bytes<video.source_bytes);
  assert(video.ssim_against_cropped_source>=0.99);
  assert.equal(video.encoding.faststart,true);
  assert(video.autoplay && video.muted && video.loop);
  const bytes = readFileSync(join(root,'assets/videos',video.asset));
  const boxes = [];
  for (let offset=0; offset+8<=bytes.length;) {
    let size=bytes.readUInt32BE(offset);
    const type=bytes.toString('ascii',offset+4,offset+8);
    if (size===1) size=Number(bytes.readBigUInt64BE(offset+8));
    if (size===0) size=bytes.length-offset;
    assert(size>=8 && offset+size<=bytes.length,'Invalid MP4 box');
    boxes.push(type); offset+=size;
  }
  assert(boxes.includes('moov') && boxes.indexOf('moov')<boxes.indexOf('mdat'),'MP4 index must precede video payload');
}
for (const file of ['app.js','clouds.js','presentation.js']) {
  assert(!/requestAnimationFrame|setInterval\s*\(|setTimeout\s*\(|fetch\s*\(/.test(read(file)), `Motion or runtime fetch in ${file}`);
}
assert(!/@keyframes|animation\s*:|transition\s*:|scroll-behavior:\s*smooth/.test(read('styles.css')));
const rows=Object.values(data.reconstruction).flatMap(setting=>setting.rows).concat(data.pose.rows);
assert.equal(rows.flatMap(row=>row.values).length,333);
assert(rows.every(row=>row.values.every(value=>/^\d+\.\d{3}$/.test(value))));
assert.deepEqual(data.pose.datasets,['Sintel','TUM-dynamics','ScanNet']);
assert.deepEqual(data.reconstruction.long.rows.find(row=>row.method==='LingBot-Map').values.slice(-2),['0.618','0.693']);
assert(data.reconstruction.long.rows.some(row=>row.method==='Stable3R (w/ FrameVGGT*)'));
assert.equal(data.publication_corrections.length,3);
assert.deepEqual(data.publication_corrections,media.tables.publication_corrections);
assert.deepEqual(JSON.parse(read('assets/paper/results-data.js').replace(/^window.STABLE3R_PAPER_RESULTS = /,'').trim().replace(/;$/,'')),data);
for (const figure of media.figures) assert.equal(sha(join(root,`assets/paper/${figure.asset}.webp`)),figure.webp_sha256);
assert.equal(clouds.scenes.length,6);
verifyCloudAssets(root);
assert.equal(clouds.auto_rotation,false);
for (const scene of clouds.scenes) {
  assert.equal(sha(join(root,`assets/clouds/${scene.asset}`)),scene.asset_sha256);
  for (const name of ['stable3r','streamvggt']) {
    assert.equal(sha(join(root,`assets/clouds/metrics-${name}-${scene.id}.json`)),scene.source_identities[name].metrics_sha256);
  }
}
let sharedFiles=0;
function inspect(dir) {
  for (const name of readdirSync(dir)) {
    if (name === '.git') continue;
    const file=join(dir,name), stat=lstatSync(file), ref=relative(root,file);
    assert(!stat.isSymbolicLink(),'Symlink in site');
    assert(!/^(?:\.env|source-.*\.tex$)/.test(name),'Private source file');
    assert(!/\.(?:pth|safetensors|zip|tar|gz)$/.test(name),'Non-website archive/model');
    if (stat.isDirectory()) inspect(file);
    else if (identities.files[ref]) {
      assert.equal(sha(file),identities.files[ref],`Original experiment content changed: ${ref}`);
      sharedFiles++;
    }
  }
}
inspect(root);
assert.equal(sharedFiles, Object.keys(identities.files).length, 'Missing original experiment content');
assert(/\.method-video video\s*\{[^}]*border:\s*0;[^}]*border-radius:\s*0;/.test(read('styles.css')));
console.log(JSON.stringify({status:'PASS',numericValues:333,paperFigures:5,pointCloudScenes:6,methodVideos:2,sections:headings,sharedFilesUnchanged:sharedFiles,originalRenderersUnchanged:true,videoAutoplayMutedLoop:true,videoBorder:false,externalRuntimeDependencies:0,standaloneRelativeAssets:true}));
