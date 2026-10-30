"use strict";
// On-demand WebGL point rendering. No auto-rotation and no animation loop.
(() => {
  const manifest=window.STABLE3R_CLOUD_MANIFEST, section=document.getElementById('clouds');
  if (!manifest || !section) return;
  const status=document.getElementById('cloud-status'), sceneSelect=document.getElementById('cloud-scene');
  const names=['streamvggt','stable3r','gt'], renderers=[], pointerState=new Map();
  let scene=null, encoded=null, mode='error', serial=0, pointSize=1.6;
  const camera={yaw:.24,pitch:-.60,distance:3.3,target:[0,0,0]};
  const vertex=`attribute vec3 a_position;attribute vec3 a_color;attribute float a_error;
    uniform mat4 u_matrix;uniform float u_size;uniform float u_error_mode;uniform float u_is_gt;
    varying vec3 v_color;void main(){gl_Position=u_matrix*vec4(a_position,1.0);gl_PointSize=u_size;
    float t=clamp(a_error/0.1,0.0,1.0);vec3 c=t<0.5?mix(vec3(0.10,0.39,0.78),vec3(1.0,0.87,0.35),t*2.0):mix(vec3(1.0,0.87,0.35),vec3(0.85,0.12,0.13),(t-0.5)*2.0);
    v_color=(u_error_mode>0.5&&u_is_gt<0.5)?c:a_color;}`;
  const fragment=`precision mediump float;varying vec3 v_color;void main(){vec2 p=gl_PointCoord-vec2(0.5);if(dot(p,p)>0.25)discard;gl_FragColor=vec4(v_color,1.0);}`;
  const minus=(a,b)=>a.map((v,i)=>v-b[i]);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
  function multiply(a,b){const c=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)c[col*4+row]+=a[k*4+row]*b[col*4+k];return c;}
  function matrix(aspect){
    const {yaw,pitch,distance:d,target:t}=camera;
    const eye=[t[0]+d*Math.sin(yaw)*Math.cos(pitch),t[1]+d*Math.sin(pitch),t[2]-d*Math.cos(yaw)*Math.cos(pitch)];
    const z=unit(minus(eye,t)),x=unit(cross([0,-1,0],z)),y=cross(z,x);
    const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
    const f=1/Math.tan(48*Math.PI/360),near=.005,far=Math.max(200,d*10);
    const p=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
    return multiply(p,view);
  }
  function decode(text,Type){const str=atob(text),bytes=new Uint8Array(str.length);for(let i=0;i<str.length;i++)bytes[i]=str.charCodeAt(i);return new Type(bytes.buffer);}
  function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  function renderer(canvas,name){
    const gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:true});
    if(!gl)throw Error('WebGL is unavailable. Please enable browser hardware acceleration.');
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const attrs=Object.fromEntries(['position','color','error'].map(k=>[k,gl.getAttribLocation(program,'a_'+k)]));
    const uniforms=Object.fromEntries(['matrix','size','error_mode','is_gt'].map(k=>[k,gl.getUniformLocation(program,'u_'+k)]));
    const buffers=[];
    return {canvas,name,gl,program,count:0,load(data,colors){
      for(const b of buffers)gl.deleteBuffer(b);buffers.length=0;
      gl.useProgram(program);
      const points=decode(data.positions,Float32Array),errors=data.errors?decode(data.errors,Float32Array):new Float32Array(points.length/3);
      if(points.length/3!==encoded.count||errors.length!==encoded.count||colors.length!==encoded.count*3)throw Error('Point/color correspondence count mismatch');
      for(const [key,array,n,type,normalized] of [['position',points,3,gl.FLOAT,false],['color',colors,3,gl.UNSIGNED_BYTE,true],['error',errors,1,gl.FLOAT,false]]){
        const b=gl.createBuffer();buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,array,gl.STATIC_DRAW);
        gl.enableVertexAttribArray(attrs[key]);gl.vertexAttribPointer(attrs[key],n,type,normalized,0,0);
      }
      this.count=points.length/3;canvas.dataset.pointCount=String(this.count);
    },draw(){
      const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
      const w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      gl.viewport(0,0,w,h);gl.clearColor(.955,.965,.978,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      if(!this.count)return;
      gl.enable(gl.DEPTH_TEST);gl.useProgram(program);
      gl.uniformMatrix4fv(uniforms.matrix,false,matrix(w/h));gl.uniform1f(uniforms.size,pointSize*ratio);
      gl.uniform1f(uniforms.error_mode,mode==='error'?1:0);gl.uniform1f(uniforms.is_gt,name==='gt'?1:0);
      gl.drawArrays(gl.POINTS,0,this.count);
      const err=gl.getError();if(err!==gl.NO_ERROR)throw Error('WebGL error '+err);
    }};
  }
  function draw(){
    try{for(const r of renderers)r.draw();section.dataset.camera=JSON.stringify(camera);}
    catch(error){status.textContent='3D rendering failed: '+error.message;section.dataset.status='error';}
  }
  function reset(fitAll=false){
    camera.yaw=.24;camera.pitch=-.60;camera.target=[0,0,0];camera.distance=3.3;
    if(fitAll&&encoded){camera.target=encoded.bounds_min.map((v,i)=>(v+encoded.bounds_max[i])/2);const radius=Math.hypot(...minus(encoded.bounds_max,encoded.bounds_min))/2;camera.distance=Math.max(1.4,radius/Math.sin(24*Math.PI/180)*1.08);}
    draw();
  }
  function pan(dx,dy){const k=camera.distance*.0015;camera.target[0]-=Math.cos(camera.yaw)*dx*k;camera.target[2]-=Math.sin(camera.yaw)*dx*k;camera.target[1]-=dy*k;}
  function controls(canvas){
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);pointerState.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button,shift:e.shiftKey});});
    canvas.addEventListener('pointermove',e=>{
      const old=pointerState.get(e.pointerId);if(!old)return;
      const current={...old,x:e.clientX,y:e.clientY};
      if(pointerState.size===2){const other=[...pointerState.entries()].find(([id])=>id!==e.pointerId)[1];const before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(current.x-other.x,current.y-other.y);if(after>1&&before>1)camera.distance=Math.max(.25,Math.min(150,camera.distance*before/after));pan((current.x-old.x)/2,(current.y-old.y)/2);}
      else if(old.button===2||old.shift){pan(current.x-old.x,current.y-old.y);}
      else{camera.yaw+=(current.x-old.x)*.007;camera.pitch=Math.max(-1.5,Math.min(1.5,camera.pitch+(current.y-old.y)*.007));}
      pointerState.set(e.pointerId,current);draw();
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>pointerState.delete(e.pointerId));
    canvas.addEventListener('wheel',e=>{e.preventDefault();camera.distance=Math.max(.25,Math.min(150,camera.distance*Math.exp(Math.max(-200,Math.min(200,e.deltaY))*.0015)));draw();},{passive:false});
    canvas.addEventListener('keydown',e=>{let handled=true;switch(e.key){case 'ArrowLeft':camera.yaw-=.12;break;case 'ArrowRight':camera.yaw+=.12;break;case 'ArrowUp':camera.pitch=Math.max(-1.5,camera.pitch-.1);break;case 'ArrowDown':camera.pitch=Math.min(1.5,camera.pitch+.1);break;case '+':case '=':camera.distance=Math.max(.25,camera.distance*.85);break;case '-':camera.distance=Math.min(150,camera.distance/ .85);break;case 'r':case 'R':reset();return;default:handled=false;}if(handled){e.preventDefault();draw();}});
  }
  function metricMarkup(model){const m=scene.metrics[model];return `<span>Acc ↓ <strong>${(m.acc*100).toFixed(2)} cm</strong></span><span>Comp ↓ <strong>${(m.comp*100).toFixed(2)} cm</strong></span><span>NC ↑ <strong>${m.nc.toFixed(3)}</strong></span>`;}
  async function loadScene(id){
    const token=++serial;scene=manifest.scenes.find(s=>s.id===id);if(!scene)return;
    section.dataset.status='loading';status.textContent='Loading real point clouds…';
    document.getElementById('cloud-advantage').textContent='';
    document.getElementById('cloud-scene-context').textContent='Loading '+scene.title+'…';
    for(const r of renderers)r.count=0;
    for(const name of ['stable3r','streamvggt'])document.getElementById('cloud-metrics-'+name).textContent='';
    draw();
    try{
      await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='assets/clouds/'+scene.asset;s.onload=()=>{s.remove();resolve();};s.onerror=()=>{s.remove();reject(Error('Could not load local point cloud data'));};document.head.append(s);});
      if(token!==serial)return;
      encoded=window.STABLE3R_CLOUD_DATA;
      if(encoded.id!==id)throw Error('Loaded scene identity mismatch');
      const colors=decode(encoded.colors,Uint8Array);
      for(const r of renderers)r.load(encoded.clouds[r.name],colors);
      for(const m of ['stable3r','streamvggt'])document.getElementById('cloud-metrics-'+m).innerHTML=metricMarkup(m);
      const gain=(1-scene.metrics.stable3r.acc/scene.metrics.streamvggt.acc)*100;
      document.getElementById('cloud-advantage').textContent=gain>=0?`${gain.toFixed(1)}% lower mean point error`:`${(-gain).toFixed(1)}% higher mean point error`;
      document.getElementById('cloud-scene-context').textContent=`${scene.dataset==='nrgbd'?'NRGBD':'7-Scenes'} / ${scene.scene} · ${scene.frames} matched frames`;
      document.getElementById('cloud-sampling-note').textContent=`${encoded.count.toLocaleString()} matched points per panel for display (same original pixel indices). Metrics use all GT-valid points in the evaluation's 224 × 224 center crops, not this display subset.`;
      status.textContent='Drag to rotate · Scroll or pinch to zoom';
      section.dataset.status='ready';section.dataset.scene=id;reset();
    }catch(error){section.dataset.status='error';status.textContent='Unable to display this comparison: '+error.message;}
  }
  try{
    for(const name of names){const canvas=document.getElementById('cloud-'+name);renderers.push(renderer(canvas,name));controls(canvas);}
    sceneSelect.replaceChildren(...manifest.scenes.map(s=>new Option(s.title,s.id)));
    sceneSelect.addEventListener('change',()=>loadScene(sceneSelect.value));
    for(const button of document.querySelectorAll('[data-cloud-mode]'))button.addEventListener('click',()=>{mode=button.dataset.cloudMode;for(const b of document.querySelectorAll('[data-cloud-mode]'))b.setAttribute('aria-pressed',String(b===button));document.getElementById('cloud-error-legend').hidden=mode!=='error';draw();});
    document.getElementById('cloud-reset').addEventListener('click',()=>reset());
    document.getElementById('cloud-fit').addEventListener('click',()=>reset(true));
    new ResizeObserver(draw).observe(document.getElementById('cloud-panels'));
    sceneSelect.value='grey-room';
    loadScene(sceneSelect.value);
  }catch(error){status.textContent=error.message;section.dataset.status='error';}
})();
