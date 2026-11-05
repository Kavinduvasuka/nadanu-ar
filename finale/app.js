import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MindARThree } from 'mindar-image-three';

// Nadanu 3.0: ORIGINAL Stage Lights concert geometry + real GLB actors, anchored to the invitation.
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
// Original Stage Lights geometry and proportions, mounted as a complete
// mini concert world on the printed invitation. Nothing is flattened to a plane.
let stageWorld, halo, noteSprites=[], noteCooldown=0;
const stageV=new THREE.Vector3(), stageQ=new THREE.Quaternion(), stageUp=new THREE.Vector3(0,1,0);
function createStage(root){
  stage=new THREE.Group();
  stage.position.set(0,-.10,.16);
  stage.scale.setScalar(.055);
  root.add(stage);
  stageWorld=stage;
  const colors=[0xff3d9a,0x33e1ff,0xffc857];
  const floor=new THREE.Mesh(new THREE.CircleGeometry(10,64),new THREE.MeshStandardMaterial({color:0x140a28,metalness:.75,roughness:.22,side:THREE.DoubleSide}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;stage.add(floor);
  neonRings=colors.concat([0xff3d9a]).map((c,i)=>{
    const mesh=new THREE.Mesh(new THREE.RingGeometry(1.8+i*1.6,1.9+i*1.6,96),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));
    mesh.rotation.x=-Math.PI/2;mesh.position.y=.01;stage.add(mesh);return mesh;
  });
  eqBars=[];
  for(let i=0;i<40;i++){
    const a=i/40*Math.PI*2;
    const bar=new THREE.Mesh(new THREE.BoxGeometry(.16,1,.16),new THREE.MeshBasicMaterial({color:0xffffff}));
    bar.position.set(Math.sin(a)*9,0,Math.cos(a)*9);stage.add(bar);eqBars.push(bar);
  }
  halo=new THREE.Mesh(new THREE.TorusGeometry(2.4,.04,12,96),new THREE.MeshBasicMaterial({color:0xff3d9a}));
  halo.position.set(0,2.2,-2.6);stage.add(halo);
  // Same 3-spot rotating lights and translucent beam cones from the uploaded HTML.
  stageSpots=[];beamCones=[];
  colors.forEach((c,i)=>{
    const light=new THREE.SpotLight(c,2.4,32,.5,.55,1);
    light.position.set(Math.cos(i*2.1)*6,9,Math.sin(i*2.1)*6);
    light.target.position.set(0,1,0);stage.add(light,light.target);stageSpots.push(light);
    const beam=new THREE.Mesh(new THREE.ConeGeometry(2.1,10,32,1,true),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.07,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    stage.add(beam);beamCones.push(beam);
  });
  const count=350,positions=new Float32Array(count*3);
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,r=Math.random()*9;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=Math.random()*8;positions[i*3+2]=Math.sin(a)*r;}
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(positions,3));
  particles=new THREE.Points(geom,new THREE.PointsMaterial({size:.07,color:0xffd9f5,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));stage.add(particles);
  // Real GLBs only: no generated human geometry.
  for(const group of performers)stage.add(group);
  // Stage Lights musical notes are mounted to the singer's group.
  const chars=['♪','♫','♪','♬'];
  chars.forEach((letter,i)=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const c=canvas.getContext('2d');c.font='48px serif';c.fillStyle=['#33e1ff','#ff3d9a','#ffc857','#ffffff'][i];c.textAlign='center';c.textBaseline='middle';c.fillText(letter,32,34);
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
  {path:'./assets/group-dancers.glb',index:2,height:2.6,x:0,z:0,maxWidth:6.7,name:'Group dancers'}
 ];
 const errors=[];
 for(const a of assets){
  try{
   const gltf=await gltfLoader.loadAsync(a.path);
   const {wrap,object}=normalizeGLB(gltf,a.height,a.x,a.z,a.maxWidth);
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
    stage.scale.setScalar(.055*(.35+.65*THREE.MathUtils.smoothstep(Math.min(1,(now-trackingTime)/1.2),0,1)));
    warmLight.position.x=.38*Math.sin(now*1.4);violetLight.position.x=.38*Math.cos(now*1.2);
    updateStageEffects(now,dt,index);
    title.position.y=.53+.012*Math.sin(now*1.5);
  }
  renderer.render(scene,camera);
 });
 initialized=true;
}
let modelErrors=[];let performersPromise=null;
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
  (performersPromise ??= loadPerformers()).then(errors=>{
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
