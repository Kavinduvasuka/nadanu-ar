import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MindARThree } from 'mindar-image-three';

// Nadanu 3.0: ORIGINAL Stage Lights concert geometry + real GLB actors, anchored to the invitation.
// Animations: singer.glb and solo-dancer.glb have embedded animation clips.
// group_dancers.glb is a STATIC mesh; it moves as a whole, not as rigged individuals.
const landing = document.querySelector('#landing');
const startButton = document.querySelector('#startButton');
const stopButton = document.querySelector('#stopButton');
const message = document.querySelector('#message');
const arUI = document.querySelector('#arUI');
const status = document.querySelector('#trackingStatus');
const clock = new THREE.Clock();
const gltfLoader = new GLTFLoader();
let mindarThree, initialized = false, running = false, busy = false, tracked = false;
let stage, label, warmLight, violetLight;
let neonRings=[], eqBars=[], particles, stageSpots=[], beamCones=[], showMode=null;
let selectedAct=null, musicContext=null, soundInterval=null, soundEnabled=false;
const performers = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
const mixers = [];
let lastFrame=0, trackingTime=0, sequenceTime=0;
const ACT_SECONDS=8, TOTAL_ACTS=3;
const actNames=['SOLO SINGING','SOLO DANCING','GROUP DANCING'];
const actBanner=document.getElementById('actBanner');
const actBannerTitle=document.getElementById('actBannerTitle');
const actBannerCount=document.getElementById('actBannerCount');
const finaleInvitation=document.getElementById('finaleInvitation');
const replayActsButton=document.getElementById('replayActsButton');
let showInvitation=false,lastPresentedAct=-1;
function presentAct(index){
 if(lastPresentedAct!==index){
  actBannerTitle.textContent=actNames[index];
  actBannerCount.textContent='ACT 0'+(index+1)+' / 03';
  lastPresentedAct=index;
 }
}
function resetPerformances(){
 sequenceTime=0;
 showInvitation=false;
 lastPresentedAct=-1;
 if(finaleInvitation)finaleInvitation.hidden=true;
 if(actBanner)actBanner.hidden=false;
 presentAct(selectedAct===null?0:selectedAct);
}
replayActsButton?.addEventListener('click',()=>{
 selectedAct=null;
 document.querySelectorAll('[data-act]').forEach(b=>b.classList.toggle('active',b.dataset.act==='auto'));
 resetPerformances();
});
// Keep the stage fixed to the invitation; gestures rotate and zoom performers only.
const orbit={yaw:0,zoom:1,pointers:new Map(),distance:0};
const BASE_SCALE=0.17;
// Smooth only the detected target's orientation. Keeping the stage under the
// native image anchor preserves its exact centre position and avoids the
// previous extra-world-pose smoothing regression.
const targetRotation=new THREE.Quaternion();
const stableRotation=new THREE.Quaternion();
const inverseTargetRotation=new THREE.Quaternion();
const fixedStageTilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(.62,0,0));
let stageRotationReady=false;
function applyOrbit(){
 performers.forEach((group,i)=>{
   group.rotation.y=orbit.yaw+(i===2 ? Math.sin(clock.getElapsedTime()*.65)*.10 : 0);
   group.scale.setScalar((i===2?1.80:3.35)*orbit.zoom);
 });
}
function bindOrbitControls(){
 const surface=document.querySelector('#arContainer');
 surface.style.touchAction='none';
 surface.addEventListener('pointerdown',e=>{
  if(!running)return;
  orbit.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  orbit.distance=0;
  try{surface.setPointerCapture(e.pointerId);}catch(_){}
 });
 surface.addEventListener('pointermove',e=>{
  if(!running||!orbit.pointers.has(e.pointerId))return;
  const old=orbit.pointers.get(e.pointerId);
  orbit.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(orbit.pointers.size===1){
    orbit.yaw+=(e.clientX-old.x)*.013;
    applyOrbit();
  }else if(orbit.pointers.size===2){
    const [a,b]=[...orbit.pointers.values()];
    const distance=Math.hypot(a.x-b.x,a.y-b.y);
    if(orbit.distance>0)orbit.zoom=THREE.MathUtils.clamp(orbit.zoom*distance/orbit.distance,.65,2.1);
    orbit.distance=distance;
  }
 });
 const release=e=>{orbit.pointers.delete(e.pointerId);orbit.distance=0;};
 surface.addEventListener('pointerup',release);
 surface.addEventListener('pointercancel',release);
 surface.addEventListener('wheel',e=>{
  if(!running)return;e.preventDefault();
  orbit.zoom=THREE.MathUtils.clamp(orbit.zoom*Math.exp(-e.deltaY*.001),.65,2.1);
 },{passive:false});
 document.querySelector('#resetViewButton')?.addEventListener('click',()=>{
  orbit.yaw=0;orbit.zoom=1;applyOrbit();
 });
}

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
// Original Stage Lights geometry and proportions, mounted as a complete
// mini concert world on the printed invitation. Nothing is flattened to a plane.
let stageWorld, halo, noteSprites=[], noteCooldown=0;
const stageV=new THREE.Vector3(), stageQ=new THREE.Quaternion(), stageUp=new THREE.Vector3(0,1,0);
function createStage(root){
  // Recreated directly from stage-lights(2).html: open circular concert floor,
  // four glowing rings, 40 moving columns, 3 colored spotlights and 500 stars.
  stage=new THREE.Group();
  // Fixed local offset from the centre of the printed invitation.
  // The parent MindAR anchor provides the image pose; do not modify its world pose.
  stage.position.set(0,0,.12);
  stage.rotation.x=.62; // Base presentation tilt, stabilized against tracker wobble below.
  stage.scale.setScalar(BASE_SCALE);
  root.add(stage);
  stageWorld=stage;
  const colors=[0xff3d9a,0x33e1ff,0xffc857];
  const floor=new THREE.Mesh(new THREE.CircleGeometry(10,96),
    new THREE.MeshStandardMaterial({color:0x140a28,metalness:.75,roughness:.22,side:THREE.DoubleSide}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;stage.add(floor);
  neonRings=[0xff3d9a,0x33e1ff,0xffc857,0xff3d9a].map((color,i)=>{
    const ring=new THREE.Mesh(new THREE.RingGeometry(1.8+i*1.6,1.9+i*1.6,96),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.y=.012+i*.002;stage.add(ring);return ring;
  });
  eqBars=[];
  for(let i=0;i<40;i++){
    const a=i/40*Math.PI*2;
    const bar=new THREE.Mesh(new THREE.BoxGeometry(.16,1,.16),
      new THREE.MeshBasicMaterial({color:0xffffff}));
    bar.position.set(Math.sin(a)*9,0,Math.cos(a)*9);stage.add(bar);eqBars.push(bar);
  }
  halo=new THREE.Mesh(new THREE.TorusGeometry(2.4,.04,12,96),
    new THREE.MeshBasicMaterial({color:0xff3d9a}));
  halo.position.set(0,2.2,-2.6);stage.add(halo);
  stageSpots=[];beamCones=[];
  colors.forEach((color,i)=>{
    const light=new THREE.SpotLight(color,2.4,32,.5,.55,1);
    light.position.set(Math.cos(i*2.1)*6,9,Math.sin(i*2.1)*6);
    light.target.position.set(0,1,0);stage.add(light,light.target);stageSpots.push(light);
    const beam=new THREE.Mesh(new THREE.ConeGeometry(2.1,10,32,1,true),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:.07,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    stage.add(beam);beamCones.push(beam);
  });
  const count=500,positions=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const angle=Math.random()*Math.PI*2,r=Math.random()*9;
    positions[i*3]=Math.cos(angle)*r;positions[i*3+1]=Math.random()*8;positions[i*3+2]=Math.sin(angle)*r;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  particles=new THREE.Points(geometry,new THREE.PointsMaterial({size:.07,color:0xffd9f5,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
  stage.add(particles);
  // Original procedural human figures are replaced by the three supplied GLBs.
  performers.forEach((group,i)=>{
    group.position.set(0,0,i===2?0:1);
    group.scale.setScalar(i===2?1.80:3.35);
    stage.add(group);
  });
  const chars=['♪','♫','♪','♬'];
  chars.forEach((letter,i)=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const c=canvas.getContext('2d');c.font='48px serif';c.fillStyle=['#33e1ff','#ff3d9a','#ffc857','#ffffff'][i];
    c.textAlign='center';c.textBaseline='middle';c.fillText(letter,32,34);
    const tex=new THREE.CanvasTexture(canvas);
    for(let j=0;j<4;j++){
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
      sprite.visible=false;sprite.userData.life=0;performers[0].add(sprite);noteSprites.push(sprite);
    }
  });
}
function updateStageEffects(t,dt,index){
  const pulse=Math.pow(1-((t*2)%1),3),sw=index===2?1.6:1;
  stageSpots.forEach((l,i)=>{
    const a=t*.4+i*2.1;
    l.position.set(Math.cos(a)*6,9,Math.sin(a)*6);
    l.target.position.set(Math.sin(t*.7+i)*1.5*sw,1,Math.cos(t*.6+i)*1.5*sw);
    l.intensity=1.8+pulse*1.6;
    const beam=beamCones[i],d=stageV.copy(l.position).sub(l.target.position),length=d.length();
    beam.position.copy(l.position).add(l.target.position).multiplyScalar(.5);
    stageQ.setFromUnitVectors(stageUp,d.normalize());beam.quaternion.copy(stageQ);
    beam.scale.y=length/10;beam.material.opacity=.05+pulse*.05;
  });
  neonRings.forEach((r,i)=>{r.scale.setScalar(1+pulse*.04*(i+1));r.material.opacity=.22+pulse*.45;});
  eqBars.forEach((bar,i)=>{const height=1.2+(Math.sin(t*3+i*.7)*.5+.5)*4+pulse*2.5;bar.scale.y=height;bar.position.y=height/2;bar.material.color.setHSL((i/40+t*.05)%1,.9,.55);});
  halo.material.color.setHSL((t*.08)%1,.9,.6);halo.scale.setScalar(1+pulse*.05);
  const positions=particles.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){let y=positions.getY(i)+dt*(.2+(i%5)*.06);if(y>8)y=0;positions.setY(i,y);}positions.needsUpdate=true;
  if(index===0){
    noteCooldown-=dt;
    if(noteCooldown<=0){
      const sprite=noteSprites.find(n=>!n.visible)||noteSprites[Math.floor(Math.random()*noteSprites.length)];
      sprite.position.set((Math.random()-.5)*.6,1.9,.4);sprite.scale.setScalar(.35);
      sprite.userData.life=1;sprite.visible=true;noteCooldown=.28+Math.random()*.2;
    }
  }
  noteSprites.forEach(s=>{if(!s.visible)return;s.userData.life-=dt*.4;if(s.userData.life<=0){s.visible=false;return;}s.position.y+=dt*.8;s.position.x+=Math.sin(t*7+s.position.y)*dt*.3;s.scale.setScalar(.35+(1-s.userData.life)*.35);s.material.opacity=Math.min(1,s.userData.life*1.6);});
}

function normalizeGLB(gltf, desiredHeight, targetX=0, targetZ=0, maxWidth=6.7){
  const object=gltf.scene;
  object.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<1e-6)throw new Error('GLB has no usable height.');
  const center=bounds.getCenter(new THREE.Vector3());
  const factor=Math.min(desiredHeight/size.y,maxWidth/Math.max(size.x,1e-6));
  const wrap=new THREE.Group();
  object.scale.multiplyScalar(factor);
  object.position.set(-center.x*factor,-bounds.min.y*factor,-center.z*factor);
  wrap.add(object);wrap.position.set(targetX,0,targetZ);
  object.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.frustumCulled=false;o.castShadow=true;}});
  return {wrap,object};
}
async function loadPerformers() {
 const assets=[
  {path:'./assets/singer.glb',index:0,height:2.25,x:0,z:0,maxWidth:3,name:'Singer'},
  {path:'./assets/solo-dancer.glb',index:1,height:2.25,x:0,z:0,maxWidth:3,name:'Solo dancer'},
  {path:'./assets/group_dancers.glb',index:2,height:2.6,x:0,z:0,maxWidth:6.7,name:'Group dancers'}
 ];
 // Download all three assets concurrently as soon as the landing page opens.
 const results=await Promise.allSettled(assets.map(async a=>{
  const gltf=await gltfLoader.loadAsync(a.path);
  const {wrap,object}=normalizeGLB(gltf,a.height,a.x,a.z,a.maxWidth);
  performers[a.index].add(wrap);
  if(gltf.animations.length){
   const mixer=new THREE.AnimationMixer(object);
   const action=mixer.clipAction(gltf.animations[0]);
   action.setLoop(THREE.LoopRepeat,Infinity);action.play();mixers.push(mixer);
  }
  console.info(`${a.name}: ${gltf.animations.length} animation clip(s)`);
 }));
 return results.flatMap((r,i)=>{
  if(r.status==='fulfilled')return [];
  console.error(`Failed to load ${assets[i].name}:`,r.reason);
  return [`${assets[i].name}: ${r.reason?.message||String(r.reason)}`];
 });
}

function setup() {
 mindarThree=new MindARThree({container:document.querySelector('#arContainer'),imageTargetSrc:'./assets/finale.mind',maxTrack:1,filterMinCF:0.0001,filterBeta:0.1,warmupTolerance:8,missTolerance:12,uiLoading:'yes',uiScanning:'no',uiError:'yes'});
 const {scene,renderer,camera}=mindarThree;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 const anchor=mindarThree.addAnchor(0),root=anchor.group;
 scene.add(new THREE.HemisphereLight(0xffffff,0x34132a,2.8));
 warmLight=new THREE.PointLight(0xffa245,3,3);warmLight.position.set(.5,.45,.55);root.add(warmLight);
 violetLight=new THREE.PointLight(0xa05bff,2,3);violetLight.position.set(-.5,.36,.5);root.add(violetLight);
 createStage(root);
 bindOrbitControls();
 label=textMesh(['SOLO SINGING'],.77,.16,0,.62,.10,67);root.add(label);
 root.visible=false;
 anchor.onTargetFound=()=>{
  tracked=true;
  trackingTime=clock.getElapsedTime();
  stageRotationReady=false;
  stage.quaternion.copy(fixedStageTilt);
  stage.visible=false; // Wait for tracking to settle before first reveal.
  root.visible=true;
  status.textContent='Invitation centre detected · locking stage…';
 };
 anchor.onTargetLost=()=>{
  tracked=false;
  stageRotationReady=false;
  stage.visible=false;
  root.visible=false;
  status.textContent='Point your camera at the printed Grand Finale invitation';
 };
 renderer.setAnimationLoop(()=>{
  const now=clock.getElapsedTime();const dt=Math.min(.05,Math.max(0,now-lastFrame));lastFrame=now;
  if(running&&tracked){
    // Native MindAR anchor maintains the printed invitation centre. Compensate
    // rapid angular jitter only: stage rotation follows a slowly filtered pose
    // rather than every noisy tracking-frame angle.
    root.updateMatrixWorld(true);
    root.getWorldQuaternion(targetRotation);
    if(!stageRotationReady){
      stableRotation.copy(targetRotation);
      stageRotationReady=true;
    }else{
      const delta=stableRotation.angleTo(targetRotation);
      // Under 1 degree is sensor jitter: avoid moving the stage.
      if(delta>THREE.MathUtils.degToRad(1)){
        const alpha=1-Math.exp(-Math.max(dt,.001)*3.2);
        stableRotation.slerp(targetRotation,alpha);
      }
    }
    inverseTargetRotation.copy(targetRotation).invert();
    stage.quaternion.copy(inverseTargetRotation).multiply(stableRotation).multiply(fixedStageTilt);
    if(!showInvitation&&selectedAct===null)sequenceTime+=dt;
    // One complete three-act showcase, followed by the formal invitation.
    if(selectedAct===null && sequenceTime>=ACT_SECONDS*TOTAL_ACTS && !showInvitation){
      showInvitation=true;
      finaleInvitation.hidden=false;
      actBanner.hidden=true;
      status.textContent='You are cordially invited to the Nadanu 3.0 Grand Finale';
    }
    const index=selectedAct===null
      ? Math.min(TOTAL_ACTS-1,Math.floor(sequenceTime/ACT_SECONDS))
      : selectedAct;
    performers.forEach((p,i)=>p.visible=!showInvitation && i===index);
    if(!showInvitation)presentAct(index);
    for(const mixer of mixers)mixer.update(dt);
    label.visible=!showInvitation;
    if(label.userData.index!==index){
      label.material.map.dispose();
      label.material.map=panelTexture([['SOLO SINGING','SOLO DANCING','GROUP DANCING'][index]],66);
      label.material.needsUpdate=true;label.userData.index=index;
    }
    // The third GLB has no animation clip: the entire model turns subtly, not individuals dancing.
    applyOrbit();
    // Lock to the invitation centre; delay the first reveal to avoid acquisition bounce.
    // No stage orbit or dynamic resizing after lock.
    if(!stage.visible&&now-trackingTime>=.4){
      stage.visible=true;
      status.textContent='Stage locked to invitation centre · drag actors · pinch to zoom';
    }
    stage.scale.setScalar(BASE_SCALE);
    warmLight.position.x=.38*Math.sin(now*1.4);violetLight.position.x=.38*Math.cos(now*1.2);
    updateStageEffects(now,dt,index);
  }
  renderer.render(scene,camera);
 });
 initialized=true;
}
let modelErrors=[];
// Begin loading in the background on initial page open, before START AR.
startButton.disabled=true;
message.textContent='Preparing 3D performances for AR…';
const performersPromise=loadPerformers();
const targetPreload=fetch('./assets/finale.mind').then(response=>{
 if(!response.ok)throw new Error('Invitation tracking target unavailable (HTTP '+response.status+').');
 return response.arrayBuffer();
}).then(buffer=>{
 if(buffer.byteLength<100)throw new Error('Invitation tracking target is empty.');
 return buffer.byteLength;
}).catch(e=>{console.warn('Target prefetch failed:',e);return null;});
Promise.all([performersPromise,targetPreload]).then(([errors,targetBytes])=>{
 modelErrors=errors;
 startButton.disabled=false;
 message.textContent=errors.length
  ? 'Some 3D models could not preload. You can still try AR.'
  : targetBytes===null
   ? 'Tracking target could not preload. You can still try AR.'
   : '3D performances ready — tap Start Invitation AR.';
}).catch(err=>{
 console.error('AR preload error:',err);
 startButton.disabled=false;
 message.textContent='Preload failed. Tap Start Invitation AR to retry.';
});
async function startAR(){
 if(busy||running)return;busy=true;startButton.disabled=true;message.textContent='Checking invitation target and 3D models…';
 try{
  // No duplicate blocking fetch here: MindAR uses the browser-cached target.
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
  resetPerformances();
  landing.style.display='none';arUI.hidden=false;
  status.textContent='Camera ready. Point at the Grand Finale invitation';
  performersPromise.then(errors=>{
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
   disableSound();
   console.info('MindAR startup did not complete. Reload before retrying; inspect the FIRST console error.');
 }
 finally{busy=false;startButton.disabled=false;}
}
async function stopAR(){
 if(busy||!running)return;busy=true;
 try{await mindarThree.stop();running=false;tracked=false;disableSound();resetPerformances();arUI.hidden=true;landing.style.display='grid';message.textContent='';}
 catch(e){console.error(e);status.textContent='Unable to stop camera. Refresh the page.';}
 finally{busy=false;}
}
startButton.addEventListener('click',()=>{
 // Must unlock Web Audio in the direct tap gesture, before camera and network awaits.
 enableSound().catch(e=>console.warn('Audio could not start:',e));
 startAR();
});
stopButton.addEventListener('click',stopAR);
window.addEventListener('pagehide',()=>{disableSound();if(running&&mindarThree)mindarThree.stop().catch(()=>{});});

window.addEventListener('unhandledrejection',ev=>console.error('Unhandled promise rejection:',ev.reason));
window.addEventListener('error',ev=>console.error('Browser script error:',ev.message,ev.filename,ev.lineno));

// Scene buttons: auto sequence by default, or choose a performance manually.
for(const button of document.querySelectorAll('[data-act]')){
 button.addEventListener('click',()=>{
  const value=button.dataset.act;
  selectedAct=value==='auto'?null:Number(value);
  resetPerformances();
  document.querySelectorAll('[data-act]').forEach(b=>b.classList.toggle('active',b===button));
 });
}
// Original in-browser instrumental beat, enabled from the START AR tap.
// iOS/Safari and Chrome require an explicit user gesture to unlock audio.
function tone(frequency,duration=.14,volume=.035,type='triangle'){
 if(!musicContext||musicContext.state!=='running')return;
 const now=musicContext.currentTime,o=musicContext.createOscillator(),g=musicContext.createGain();
 o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);
 o.connect(g);g.connect(musicContext.destination);o.start(now);o.stop(now+duration);
}
const soundButton=document.getElementById('soundButton');
function disableSound(){
 if(soundInterval!==null){clearInterval(soundInterval);soundInterval=null;}
 soundEnabled=false;
 if(soundButton)soundButton.textContent='SOUND OFF';
}
async function enableSound(){
 if(soundEnabled)return;
 const AudioCtx=window.AudioContext||window.webkitAudioContext;
 if(!AudioCtx){if(soundButton)soundButton.textContent='SOUND UNAVAILABLE';return;}
 musicContext??=new AudioCtx();
 // Invoked synchronously within START click; the resume call is made prior to await.
 await musicContext.resume();
 if(soundEnabled)return;
 soundEnabled=true;
 if(soundButton)soundButton.textContent='SOUND ON';
 let step=0;
 soundInterval=setInterval(()=>{
  if(!running||!tracked)return;
  const bass=[110,110,146.83,98][Math.floor(step/8)%4];
  if(step%4===0)tone(bass,.19,.055,'sine');
  tone([329.63,392,440,523.25][step%4],.12,.018,'triangle');
  step++;
 },240);
}
if(soundButton)soundButton.addEventListener('click',()=>{
 if(soundEnabled)disableSound();
 else enableSound().catch(e=>console.warn('Audio could not start:',e));
});
