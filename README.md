# Stable3R project page

Static project website for **Stable3R: Streaming 3D Reconstruction with Stable Geometric References**.

Website: https://venite-xjc.github.io/Stable3R-page/

## GitHub Pages

Publish the `main` branch, `/(root)`, in **Settings → Pages → Deploy from a branch**. This repository already contains the website files at its root and a `.nojekyll` marker. No build step, backend, npm install, custom domain, or DNS change is required.

To upload an archive manually, extract it and upload its contents, keeping `index.html` at the repository root. Do not introduce an extra `dist/` directory.

For local preview, run `python3 -m http.server 8767` from this directory. The interactive point clouds require WebGL. Images, tables, and point clouds are local assets; no CDN is used.

## Verification

```bash
node --check app.js
node --check clouds.js
node scripts/verify-site.mjs
```

## Publication corrections (2026-10-28)

- Camera-pose columns are labeled **Sintel, TUM-dynamics, ScanNet**, in that order. Numeric pose values are unchanged.
- LingBot-Map NRGBD normal consistency is **Mean 0.618 / Median 0.693**, verified against the original nine-scene, 300-frame evaluation log.
- The retention strategy is consistently named **FrameVGGT***: a paper-based reimplementation with a 16-frame mid-memory budget and 4 sparse anchors, used by both Stable3R and StreamVGGT. Direct inference is labeled separately.

The source archive and figure hashes remain in `assets/media-manifest.json`. The three explicit corrections are recorded in the `publication_corrections` fields of that manifest and `assets/paper/results.json`. The original private manuscript source, private logs, model weights, and local preview artifacts are not included in this repository.

## Interactive comparisons

Three selected scenes compare Stable3R, StreamVGGT, and ground truth with matched RGB inputs, sampled pixels, viewing parameters, and error-color scales. Rotate, pan, or zoom any panel to synchronize all three views. There is no automatic animation.

These are selected examples, not dataset-wide averages. The six scene-level metric JSON files are unchanged; hashes and comparison details are in `assets/clouds/manifest.json`. Paper table scores and point-cloud examples follow their respective, separately stated protocols.
