import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MindARThree } from 'mindar-image-three';

// Nadanu 3.0 Grand Finale: the THREE uploaded 3D models, isolated from your existing repository.
// Animations: singer.glb and solo-dancer.glb have embedded animation clips.
// group-dancers.glb is a STATIC mesh; it moves as a whole, not as rigged individuals.
const landing = document.querySelector('#landing');
const startButton = document.querySelector('#startButton');
const stopButton = document.querySelector('#stopButton');
const message = document.querySelector('#message');
const arUI = document.querySelector('#arUI');
const status = document.querySelector('#trackingStatus');
const clock = new THREE.Clock();
const gltfLoader = new GLTFLoader();
let mindarThree, initialized = false, running = false, busy = false, tracked = false;
let stage, title, subtitle, label, warmLight, violetLight;
let neonRings=[], eqBars=[], particles, stageSpots=[], beamCones=[], showMode=null;
let selectedAct=null, musicContext=null, soundInterval=null, soundEnabled=false;
const performers = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
const mixers = [];
let lastFrame=0, trackingTime=0, sequenceTime=0;

function panelTexture(lines, fontSize=76) {
  const cv=document.createElement('canvas');cv.width=1024;cv.height=256;
  const c=cv.getContext('2d');c.textAlign='center';c.textBaseline='middle';
  c.shadowBlur=26;c.shadowColor='#f47421';c.fillStyle='#ffdc90';
  lines.forEach((str,i)=>{let s=fontSize;c.font=`900 ${s}px Impact, Arial Black, sans-serif`;
    while(c.measureText(str).width>950&&s>24){s-=3;c.font=`900 ${s}px Impact, Arial Black, sans-serif`;}
    c.fillText(str,512,lines.length===1?130:82+i*110);});
  const texture=new THREE.CanvasTexture(cv);texture.encoding=THREE.sRGBEncoding;return texture;
}
function textMesh(lines,w,h,x,y,z,size=74){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:panelTexture(lines,size),transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 mesh.position.set(x,y,z);return mesh;
}
function box(x,y,z,w,h,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,metalness:.25,roughness:.4}));m.position.set(x,y,z);return m;}
function createStage(root){
  // Stage Lights style: black/plum platform, neon pink/cyan/gold, LED equalizer,
  // animated spotlights and glitter. All are actual Three.js geometry anchored by MindAR.
  stage=new THREE.Group(); stage.position.set(0,-.16,.17); root.add(stage);
  const dark=new THREE.MeshStandardMaterial({color:0x140a28,metalness:.65,roughness:.27});
  const pink=0xff3d9a, cyan=0x33e1ff, gold=0xffc857;
  stage.add(box(0,-.032,0,.98,.064,.43,0x170c2a));
  stage.add(box(0,-.067,.06,1.02,.012,.47,pink));
  stage.add(box(0,.21,-.17,.94,.44,.025,0x10091d));
  stage.add(box(0,.44,-.15,1.04,.014,.032,gold));
  for(let x of [-.48,.48]){
    stage.add(box(x,.17,-.15,.018,.52,.025,cyan));
    stage.add(box(x,-.005,.16,.11,.16,.095,0x15101e));
  }
  const ringMaterial=(color)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.58,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false});
  for(let i=0;i<3;i++){
    const r=new THREE.Mesh(new THREE.RingGeometry(.15+i*.105,.157+i*.105,64),ringMaterial([pink,cyan,gold][i]));
    r.rotation.x=-Math.PI/2; r.position.set(0,.006+i*.001,.05);stage.add(r);neonRings.push(r);
  }
  for(let i=0;i<24;i++){
    const x=-.437+i*.038;
    const b=new THREE.Mesh(new THREE.BoxGeometry(.018,.08,.009),new THREE.MeshBasicMaterial({color:[pink,cyan,gold][i%3]}));
    b.position.set(x,.21,-.147);stage.add(b);eqBars.push(b);
  }
  const coneMat=(color)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.075,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  for(let i=0;i<3;i++){
    const color=[pink,cyan,gold][i];
    const spot=new THREE.SpotLight(color,2.2,3,.65,.65,1);
    spot.position.set((i-1)*.29,.65,.05);spot.target.position.set(0,.16,.05);
    stage.add(spot,spot.target);stageSpots.push(spot);
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.15,.55,24,1,true),coneMat(color));
    cone.position.set((i-1)*.29,.37,.05);cone.rotation.z=Math.PI;
    stage.add(cone);beamCones.push(cone);
  }
  const count=90, pts=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    pts[i*3]=(Math.random()-.5)*1.0;
    pts[i*3+1]=Math.random()*.8;
    pts[i*3+2]=(Math.random()-.5)*.42;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pts,3));
  particles=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xffd9f5,size:.009,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false}));
  stage.add(particles);
  // Actual GLB performers, never replaced by cylinder/sphere characters.
  for(const group of performers)stage.add(group);
}

function normalizeGLB(gltf, desiredHeight, targetX=0, targetZ=.07) {
  const object=gltf.scene;
  object.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(object), size=bounds.getSize(new THREE.Vector3());
  if(size.y<1e-6)throw new Error('Model has no usable height.');
  const center=bounds.getCenter(new THREE.Vector3());
  const factor=desiredHeight/size.y;
  // Center on X/Z, put feet at the stage floor, retain all texture/material data.
  const wrap=new THREE.Group();
  object.scale.multiplyScalar(factor);
  object.position.set(-center.x*factor,-bounds.min.y*factor,-center.z*factor);
  wrap.add(object);wrap.position.set(targetX,.032,targetZ);
  object.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.frustumCulled=false;}});
  return {wrap,object};
}
async function loadPerformers() {
 const assets=[
  {path:'./assets/singer.glb',index:0,height:.33,x:0,z:.10,name:'Singer'},
  {path:'./assets/solo-dancer.glb',index:1,height:.34,x:0,z:.10,name:'Solo dancer'},
  {path:'./assets/group-dancers.glb',index:2,height:.32,x:0,z:.10,name:'Group dancers'}
 ];
 const errors=[];
 for(const a of assets){
  try{
   const gltf=await gltfLoader.loadAsync(a.path);
   const {wrap,object}=normalizeGLB(gltf,a.height,a.x,a.z);
   performers[a.index].add(wrap);
   if(gltf.animations.length){
    const mixer=new THREE.AnimationMixer(object);
    const chosen=gltf.animations[0];
    const action=mixer.clipAction(chosen);action.setLoop(THREE.LoopRepeat,Infinity);action.play();
    mixers.push(mixer);
   }
   console.info(`${a.name}: ${gltf.animations.length} animation clip(s)`);
  }catch(e){errors.push(`${a.name}: ${e.message}`);console.error(e);}
 }
 return errors;
}
function setup() {
 mindarThree=new MindARThree({container:document.querySelector('#arContainer'),imageTargetSrc:'./assets/finale.mind',maxTrack:1,uiLoading:'yes',uiScanning:'no',uiError:'yes'});
 const {scene,renderer,camera}=mindarThree;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 const anchor=mindarThree.addAnchor(0),root=anchor.group;
 scene.add(new THREE.HemisphereLight(0xffffff,0x34132a,2.0));
 warmLight=new THREE.PointLight(0xffa245,3,3);warmLight.position.set(.5,.45,.55);root.add(warmLight);
 violetLight=new THREE.PointLight(0xa05bff,2,3);violetLight.position.set(-.5,.36,.5);root.add(violetLight);
 createStage(root);
 title=textMesh(['NADANU 3.0','GRAND FINALE'],1.1,.32,0,.53,.20,83);root.add(title);
 subtitle=textMesh(['YOU ARE CORDIALLY INVITED'],1.05,.22,0,-.50,.17,52);root.add(subtitle);
 label=textMesh(['SOLO SINGING'],.77,.16,0,.34,.35,67);root.add(label);
 root.visible=false;
 anchor.onTargetFound=()=>{tracked=true;trackingTime=clock.getElapsedTime();root.visible=true;status.textContent='Grand Finale stage detected — watch the performers!';};
 anchor.onTargetLost=()=>{tracked=false;root.visible=false;status.textContent='Point your camera at the printed Grand Finale invitation';};
 renderer.setAnimationLoop(()=>{
  const now=clock.getElapsedTime();const dt=Math.min(.05,Math.max(0,now-lastFrame));lastFrame=now;
  if(running&&tracked){
    sequenceTime+=dt;
    // 6s singer, 6s solo dancer, 6s group, then repeat.
    const index=selectedAct===null?Math.floor(sequenceTime/6)%3:selectedAct;
    performers.forEach((p,i)=>p.visible=i===index);
    for(const mixer of mixers)mixer.update(dt);
    if(label.userData.index!==index){
      label.material.map.dispose();
      label.material.map=panelTexture([['SOLO SINGING','SOLO DANCING','GROUP DANCING'][index]],66);
      label.material.needsUpdate=true;label.userData.index=index;
    }
    // The third GLB has no animation clip: the entire model turns subtly, not individuals dancing.
    performers[2].rotation.y=Math.sin(now*.65)*.10;
    stage.scale.setScalar(.35+.65*THREE.MathUtils.smoothstep(Math.min(1,(now-trackingTime)/1.2),0,1));
    warmLight.position.x=.38*Math.sin(now*1.4);violetLight.position.x=.38*Math.cos(now*1.2);
    const pulse=Math.pow(1-((now*2)%1),3);
    neonRings.forEach((r,i)=>{const q=1+pulse*.06*(i+1);r.scale.set(q,q,q);r.material.opacity=.26+pulse*.54;});
    eqBars.forEach((b,i)=>{const h=.5+(.5+.5*Math.sin(now*8+i*.9))*1.1+pulse*.65;b.scale.y=h;b.position.y=.21+(h-1)*.04;});
    stageSpots.forEach((l,i)=>{l.target.position.set(Math.sin(now*.8+i*2)*.28,.14,Math.cos(now*.6+i)*.10);l.intensity=1.4+pulse*1.7;});
    beamCones.forEach((cone,i)=>{cone.rotation.z=Math.PI+Math.sin(now*.8+i*2)*.32;cone.material.opacity=.045+pulse*.065;});
    const attr=particles.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){let y=attr.getY(i)+dt*(.07+(i%5)*.012);if(y>.84)y=0;attr.setY(i,y);}attr.needsUpdate=true;
    title.position.y=.53+.012*Math.sin(now*1.5);
  }
  renderer.render(scene,camera);
 });
 initialized=true;
}
let modelErrors=[];
async function startAR(){
 if(busy||running)return;busy=true;startButton.disabled=true;message.textContent='Checking invitation target and 3D models…';
 try{
  const res=await fetch('./assets/finale.mind',{cache:'no-store'});
  if(!res.ok)throw new Error(`Target file HTTP ${res.status}. Check assets/finale.mind`);
  const targetBytes = await res.arrayBuffer();
  if(targetBytes.byteLength < 100) throw new Error('finale.mind is empty or too small. Compile it again.');
  console.info('MindAR target loaded:',targetBytes.byteLength,'bytes');
  const cam = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  if(!window.isSecureContext || !cam) throw new Error('Camera requires localhost or HTTPS in a compatible browser.');
  console.info('Secure context:',window.isSecureContext,'Three revision:',THREE.REVISION);

  if(!initialized) setup();
  message.textContent='Preparing camera… (check browser permission prompt)';
  // Start MindAR before downloading GLBs. Note: Three.js pinned to r147 for compatibility.
  let timer;
  try {
    await Promise.race([
      mindarThree.start(),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Camera start timed out after 25 seconds. Close other camera apps, check the browser console, and refresh.')),25000);})
    ]);
  } finally { clearTimeout(timer); }
  running=true;clock.start();lastFrame=clock.getElapsedTime();
  landing.style.display='none';arUI.hidden=false;
  status.textContent='Camera ready. Loading your 3D performers…';
  loadPerformers().then(errors=>{
    modelErrors=errors;
    if(!running) return;
    status.textContent=errors.length
      ? 'Camera ready. Some 3D files failed; see Console (F12).'
      : 'Point at the Grand Finale invitation';
  }).catch(err=>{console.error('Model loading failed:',err);if(running)status.textContent='3D loading failed — see Console (F12).';});
 }catch(e){
   console.error('MindAR startup failure (original value):', e);
   const detail = e instanceof Error ? `${e.name}: ${e.message}` :
     (e == null ? 'MindAR rejected startup without an error message.' : String(e));
   message.textContent = `AR startup failed: ${detail}`;
   // MindAR may fail before its internal controller is initialized.
   // Calling stop() at this point produces a misleading stopProcessVideo error.
   // Do not stop an AR session that never reached the running state.
   running=false;
   tracked=false;
   console.info('MindAR startup did not complete. Reload before retrying; inspect the FIRST console error.');
 }
 finally{busy=false;startButton.disabled=false;}
}
async function stopAR(){
 if(busy||!running)return;busy=true;
 try{await mindarThree.stop();running=false;tracked=false;arUI.hidden=true;landing.style.display='grid';message.textContent='';}
 catch(e){console.error(e);status.textContent='Unable to stop camera. Refresh the page.';}
 finally{busy=false;}
}
startButton.addEventListener('click',startAR);
stopButton.addEventListener('click',stopAR);
window.addEventListener('pagehide',()=>{if(soundInterval)clearInterval(soundInterval);if(running&&mindarThree)mindarThree.stop().catch(()=>{});});

window.addEventListener('unhandledrejection',ev=>console.error('Unhandled promise rejection:',ev.reason));
window.addEventListener('error',ev=>console.error('Browser script error:',ev.message,ev.filename,ev.lineno));

// Scene buttons: auto sequence by default, or choose a performance manually.
for(const button of document.querySelectorAll('[data-act]')){
 button.addEventListener('click',()=>{
  const value=button.dataset.act;selectedAct=value==='auto'?null:Number(value);
  document.querySelectorAll('[data-act]').forEach(b=>b.classList.toggle('active',b===button));
 });
}
// Optional original in-browser instrumental beat; starts only on user click.
function tone(frequency,duration=.14,volume=.035,type='triangle'){
 if(!musicContext)return;
 const now=musicContext.currentTime,o=musicContext.createOscillator(),g=musicContext.createGain();
 o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);
 o.connect(g);g.connect(musicContext.destination);o.start(now);o.stop(now+duration);
}
const soundButton=document.getElementById('soundButton');
if(soundButton)soundButton.addEventListener('click',async()=>{
 if(soundEnabled){clearInterval(soundInterval);soundEnabled=false;soundButton.textContent='SOUND OFF';return;}
 musicContext ??= new (window.AudioContext||window.webkitAudioContext)();await musicContext.resume();
 soundEnabled=true;soundButton.textContent='SOUND ON';let step=0;
 soundInterval=setInterval(()=>{
  if(!running||!tracked)return;
  const bass=[110,110,146.83,98][Math.floor(step/8)%4];
  if(step%4===0)tone(bass,.19,.055,'sine');
  tone([329.63,392,440,523.25][step%4],.12,.018,'triangle');
  step++;
 },240);
});
