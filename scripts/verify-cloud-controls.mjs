import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';

const originalSha = '85589815294bbd600ac6be98e69dbac659b22af2224bc6c905163b2b0b25413d';
const directionChanges = [
  ['camera.yaw-=(current.x-old.x)*.007', 'camera.yaw+=(current.x-old.x)*.007'],
  ['camera.pitch-(current.y-old.y)*.007', 'camera.pitch+(current.y-old.y)*.007'],
  ["case 'ArrowLeft':camera.yaw+=.12", "case 'ArrowLeft':camera.yaw-=.12"],
  ["case 'ArrowRight':camera.yaw-=.12", "case 'ArrowRight':camera.yaw+=.12"],
  ["case 'ArrowUp':camera.pitch=Math.min(1.5,camera.pitch+.1)", "case 'ArrowUp':camera.pitch=Math.max(-1.5,camera.pitch-.1)"],
  ["case 'ArrowDown':camera.pitch=Math.max(-1.5,camera.pitch-.1)", "case 'ArrowDown':camera.pitch=Math.min(1.5,camera.pitch+.1)"]
];

// Preserve the original identity check: only these six direction mappings may differ.
export function restoreOriginalControls(source) {
  for (const [fixed, original] of directionChanges) {
    assert.equal(source.split(fixed).length, 2, `Expected one corrected mapping: ${fixed}`);
    source = source.replace(fixed, original);
  }
  return source;
}

export function verifyCloudControls(source) {
  assert.equal(createHash('sha256').update(restoreOriginalControls(source)).digest('hex'), originalSha,
    'Changes beyond the six direction mappings: projection, shading, data and rendering must stay frozen');
  const slice = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
  const camera = {yaw: .24, pitch: -.60, distance: 3.3, target: [0, 0, 0]};
  const section = {dataset: {}}, frames = [[], [], []];
  const context = {
    camera, section, encoded: null, pointerState: new Map(), status: {},
    renderers: frames.map(frame => ({draw() { frame.push(Array.from(context.matrix(1))); }}))
  };
  // Execute the actual math and event handlers, not a second implementation.
  runInNewContext(
    slice('  const minus=', '  function decode(') +
    slice('  function draw(){', '  function metricMarkup('), context);
  const canvas = () => {
    const handlers = new Map();
    const element = {focus() {}, setPointerCapture() {}, addEventListener(type, fn) { handlers.set(type, fn); }};
    context.controls(element);
    return {fire(type, values = {}) {
      handlers.get(type)({pointerId: 1, clientX: 0, clientY: 0, button: 0, shiftKey: false,
        preventDefault() {}, ...values});
    }};
  };
  const canvases = [canvas(), canvas(), canvas()];
  const reset = () => { context.pointerState.clear(); context.reset(); };
  const nearPoint = () => [Math.sin(camera.yaw) * Math.cos(camera.pitch), Math.sin(camera.pitch),
    -Math.cos(camera.yaw) * Math.cos(camera.pitch)].map(v => v * .4);
  const screen = point => {
    const m = context.matrix(1), p = [...point, 1];
    const clip = [0, 1, 2, 3].map(row => p.reduce((sum, value, col) => sum + m[col * 4 + row] * value, 0));
    return [clip[0] / clip[3], -clip[1] / clip[3]];
  };
  const drag = (panel, dx, dy, extras = {}) => {
    panel.fire('pointerdown', extras);
    panel.fire('pointermove', {clientX: dx, clientY: dy, ...extras});
    panel.fire('pointerup');
  };
  let cases = 0;
  for (const panel of canvases) {
    for (const [dx, dy, axis, direction] of [[60,0,0,1],[-60,0,0,-1],[0,60,1,1],[0,-60,1,-1]]) {
      reset(); const point = nearPoint(), before = screen(point);
      drag(panel, dx, dy);
      assert((screen(point)[axis] - before[axis]) * direction > 0, 'Visible near surface must follow the drag');
      assert.equal(context.pointerState.size, 0);
      for (const frame of frames.slice(1)) assert.deepEqual(frame.at(-1), frames[0].at(-1), 'Three panels must stay synchronized');
      cases++;
    }
  }
  for (const [key, axis, direction] of [['ArrowRight',0,1],['ArrowLeft',0,-1],['ArrowDown',1,1],['ArrowUp',1,-1]]) {
    reset(); const point = nearPoint(), before = screen(point);
    canvases[0].fire('keydown', {key});
    assert((screen(point)[axis] - before[axis]) * direction > 0, 'Keys must match the visible drag direction');
    cases++;
  }
  reset(); drag(canvases[0], 0, 10000); assert.equal(camera.pitch, -1.5); cases++;
  reset(); drag(canvases[0], 0, -10000); assert.equal(camera.pitch, 1.5); cases++;
  for (const [key, limit] of [['ArrowUp',1.5], ['ArrowDown',-1.5]]) {
    reset(); for (let i=0; i<100; i++) canvases[0].fire('keydown', {key});
    assert.equal(camera.pitch, limit); cases++;
  }
  reset(); drag(canvases[0], 60, 0, {pointerType: 'touch'}); assert(camera.yaw < .24); cases++;
  reset(); drag(canvases[0], 20, 15, {shiftKey: true});
  assert.equal(camera.yaw, .24); assert.equal(camera.pitch, -.60); assert(camera.target[0] < 0); cases++;
  reset(); drag(canvases[0], 20, 15, {button: 2});
  assert.equal(camera.yaw, .24); assert.equal(camera.pitch, -.60); assert(camera.target[0] < 0); cases++;
  reset(); canvases[0].fire('wheel', {deltaY: -100}); assert(camera.distance < 3.3); cases++;
  reset(); canvases[0].fire('keydown', {key: '+'}); assert(camera.distance < 3.3); cases++;
  canvases[0].fire('keydown', {key: 'r'});
  assert.deepEqual(JSON.parse(JSON.stringify(camera)), {yaw: .24, pitch: -.60, distance: 3.3, target: [0, 0, 0]}); cases++;
  canvases[0].fire('pointerdown'); canvases[0].fire('pointercancel');
  assert.equal(context.pointerState.size, 0); cases++;
  return {cases, panels: 3, dragFollowsVisibleSurface: true, projectionAndPayloadCodeUnchanged: true};
}
