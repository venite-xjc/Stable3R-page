# Stable3R project page

Static project website for **Stable3R: Streaming 3D Reconstruction with Stable Geometric References**.

Website: https://venite-xjc.github.io/Stable3R-page/

The GLD-inspired edition is now the main homepage (2026-11-23), replacing the
previous root layout. `/gld/` remains a compatible alias containing the same page;
both declare the root URL as canonical. The old homepage is recoverable from Git
at `d8c6e24`. There is no redirect to, or link back to, the old root layout.

## GitHub Pages

Publish the `main` branch, `/(root)`, in **Settings → Pages → Deploy from a branch**. This repository already contains the website files at its root and a `.nojekyll` marker. No build step, backend, npm install, custom domain, or DNS change is required.

To upload an archive manually, extract it and upload its contents, keeping `index.html` at the repository root. Do not introduce an extra `dist/` directory.

For local preview, run `python3 -m http.server 8767` from this directory. The interactive point clouds require WebGL. Images, tables, and point clouds are local assets; no CDN is used.

## Verification

```bash
node --check app.js
node --check clouds.js
node --check presentation.js
node scripts/verify-site.mjs
node scripts/verify-site.mjs gld
```

## Paper masthead

The header lists the five authors in the order shown on https://venite-xjc.github.io/,
with affiliations and the corresponding-author mark supplied by the authors.
Verified personal links are provided for Jincheng Xiong and Ming Qian; Hang Zhang
links to the OpenReview profile referenced by that homepage. No unconfirmed
same-name profiles are linked. Resource buttons are intentionally disabled until
their destinations are provided. Their embedded icons are credited in
`assets/icons/SOURCES.txt`. The Abstract is visible without interaction.

## Publication corrections (2026-10-28)

- Camera-pose columns are labeled **Sintel, TUM-dynamics, ScanNet**, in that order. Numeric pose values are unchanged.
- LingBot-Map NRGBD normal consistency is **Mean 0.618 / Median 0.693**, verified against the original nine-scene, 300-frame evaluation log.
- The retention strategy is consistently named **FrameVGGT***: a paper-based reimplementation with a 16-frame mid-memory budget and 4 sparse anchors, used by both Stable3R and StreamVGGT. Direct inference is labeled separately.

The source archive and figure hashes remain in `assets/media-manifest.json`. The three explicit corrections are recorded in the `publication_corrections` fields of that manifest and `assets/paper/results.json`. The original private manuscript source, private logs, model weights, and local preview artifacts are not included in this repository.

## Interactive comparisons

Six selected scenes compare Stable3R, StreamVGGT, and ground truth with matched RGB inputs, sampled pixels, viewing parameters, and error-color scales. Rotate, pan, or zoom any panel to synchronize all three views. There is no automatic animation.

These are selected examples, not dataset-wide averages. The original three demos
and their six raw metric files are unchanged. Three additional demos use fresh
paired inference in `homepage_common_input_v2`: Apartment layout (10 frames),
Thin structures (4 frames), and Office workspace (25 frames). Both models load
the same frozen input object at 518×392, BF16 and full history. RGB, GT, masks,
frame order and checkpoint identities are checked before export. Display sampling
uses the same pixel indices; metrics use the full evaluated cloud. No confidence
filter or denoising is applied. There are now twelve raw metric JSON files;
their hashes and comparison details are in `assets/clouds/manifest.json`.
Paper table scores and point-cloud examples follow their respective, separately
stated protocols. No dataset-wide benchmark was rerun or changed.

## Main homepage layout

A copper-header, initially collapsed News disclosure appears immediately before
Abstract, with white header text and a white expanded body with dark text.
The 14px summary has no separate News badge and fits one line at desktop widths;
it wraps naturally on narrow screens.
It introduces the authors' follow-up ABot-Recon, contrasts ultra-long outdoor
routes with Stable3R's bounded-spatial-area focus, and links the project homepage,
technical report, evaluation branch, inference runtime and training branch.
The over-100K-frame phrasing is author-supplied positioning, not an additional
benchmark claim measured by this website. The disclosure uses native HTML and
does not add JavaScript, animation or an external runtime dependency.

The page contains Abstract, Analysis, Method, 3D comparison, Results and Citation.
Both cropped method videos play silently and loop using native browser controls.
The Abstract is always visible, and the footer only credits the GLD layout.
Experiment data and renderers are frozen in `scripts/content-identities.json`;
the verifier also checks video hashes, relative paths and metadata hooks.

All assets are served from this repository. `gld/` is kept synchronized with the
root; `pvsm/` remains a separate earlier alternative and is not the homepage.
