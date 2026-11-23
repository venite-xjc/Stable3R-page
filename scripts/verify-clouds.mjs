import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const LEGACY_SCENES = {
  "complete-kitchen": "60b69fb8cc19af405937fe464baeef2a764f9e0b2ac1b2be3c233c2e6eed5eb3",
  "stairs": "8958a8b2b916e8a7d1917f77a53ffd8f4eb301de9de9c90aa18a1dc2c10c35bb",
  "grey-room": "284dc54dabb85d4ca2c1c56f676b976b4bed4e6fdbf7e0a0229bbf21f465ee55"
};
const EXPECTED_IDS = ['complete-kitchen','stairs','grey-room','morning-apartment','thin-geometry','office-workspace'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

export function verifyCloudAssets(root) {
  const base=join(root,'assets/clouds');
  const read=ref=>readFileSync(join(base,ref));
  const manifest=JSON.parse(read('manifest.json'));
  assert.equal(manifest.status,'PASS');
  assert.deepEqual(manifest.scenes.map(s=>s.id),EXPECTED_IDS);
  assert(manifest.same_render_settings && !manifest.auto_rotation && !manifest.performance_claim);
  assert.deepEqual(manifest.error_color_range_m,[0,0.1]);
  const fromJs=JSON.parse(read('manifest.js').toString().replace(/^window.STABLE3R_CLOUD_MANIFEST = /,'').trim().replace(/;$/,''));
  assert.deepEqual(fromJs,manifest);
  for(const scene of manifest.scenes) {
    if(LEGACY_SCENES[scene.id]) assert.equal(hash(JSON.stringify(scene)),LEGACY_SCENES[scene.id], 'Original scene metadata changed: '+scene.id);
    else assert.equal(scene.source_run,'homepage_common_input_v2');
    assert(scene.rgb_canonical_max_abs<=1e-6 && scene.gt_max_abs<=1e-6 && scene.same_gt_mask);
    assert.equal(scene.memory,'full'); assert.equal(scene.precision,'bf16');
    assert.deepEqual(scene.resolution_wh,[518,392]);
    assert.equal(scene.frames,scene.frame_ids.length);
    assert.equal(scene.frames,new Set(scene.frame_ids).size);
    const bytes=read(scene.asset);
    assert.equal(hash(bytes),scene.asset_sha256);
    const payload=JSON.parse(bytes.toString().replace(/^window.STABLE3R_CLOUD_DATA = /,'').trim().replace(/;$/,''));
    assert.equal(payload.id,scene.id);
    assert.equal(payload.count,scene.display.point_count);
    assert(payload.count>0 && payload.count<=110000 && scene.display.metrics_use_full_cloud);
    assert.equal(Buffer.from(payload.colors,'base64').length,payload.count*3);
    assert(Number.isFinite(payload.meters_per_unit) && payload.meters_per_unit>0);
    assert.deepEqual(Object.keys(payload.clouds).sort(),['gt','stable3r','streamvggt']);
    assert(payload.bounds_min.every(Number.isFinite) && payload.bounds_max.every(Number.isFinite));
    for(const [name,data] of Object.entries(payload.clouds)) {
      const points=Buffer.from(data.positions,'base64');
      assert.equal(points.length,payload.count*12);
      for(let i=0;i<points.length;i+=4) {
        const v=points.readFloatLE(i),axis=(i/4)%3;
        assert(Number.isFinite(v) && v>=payload.bounds_min[axis]-1e-6 && v<=payload.bounds_max[axis]+1e-6);
      }
      if(name==='gt') {assert.equal(data.errors,null);continue;}
      const errors=Buffer.from(data.errors,'base64');
      assert.equal(errors.length,payload.count*4);
      for(let i=0;i<errors.length;i+=4) assert(Number.isFinite(errors.readFloatLE(i)) && errors.readFloatLE(i)>=0);
      const rawBytes=read('metrics-'+name+'-'+scene.id+'.json');
      assert.equal(hash(rawBytes),scene.source_identities[name].metrics_sha256);
      const raw=JSON.parse(rawBytes);
      assert.deepEqual(raw.metrics,scene.metrics[name]);
      assert.equal(raw.semantic_input_sha256,scene.semantic_input_sha256);
      assert.equal(raw.input_file_sha256,scene.same_input_file_sha256);
      assert.equal(raw.frame_count,scene.frames);
      assert.equal(raw.memory,'full');
      for(const k of ['acc','comp','nc','acc_med','comp_med','nc_med']) assert(Number.isFinite(raw.metrics[k]));
      assert(raw.metrics.acc>=0 && raw.metrics.comp>=0 && raw.metrics.nc>=0 && raw.metrics.nc<=1);
      assert.equal(raw.checkpoint_sha256,name==='stable3r'?'47a5afa5c1fa61c89ab5843261a453259d676f932bf60b616f80d2000ac47567':'3d3d914d09609fdb485e16947c4885cca0e5ea4e5557598a3b3ffb1cfe0a2f59');
    }
  }
  return {scenes:manifest.scenes.length,originalScenesUnchanged:3,newMatchedInputScenes:3,rawMetricFiles:12};
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) console.log(JSON.stringify({status:'PASS',...verifyCloudAssets(resolve(process.argv[2]))}));
