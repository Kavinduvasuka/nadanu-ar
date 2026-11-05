import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';

// NADANU 3.0 — genuine 3D procedural stage & performers.
// No GLB downloads required. Your own assets/finale.mind is required.
const $ = id => document.getElementById(id);
const landing = $('landing'), startBtn = $('startButton'), stopBtn = $('stopButton');
const status = $('trackingStatus'), message = $('message'), arUI = $('arUI');
const actLabel = $('actLabel'), audioBtn = $('audioButton');
const GOLD = 0xffc35e, ORANGE = 0xff6c2a, PURPLE = 0xaf50ed;
let mindar, renderer, scene, camera, stage, root, titlePlane, invitePlane;
let initialized=false, running=false, working=false, tracked=false;
let sequenceTime=0, lastFrame=0, currentAct=-1;
let performers=[], spotlights=[], leds=[], sparkles=[], showStage;
let audioCtx=null, master=null, musicTimer=null, nextBeat=0, beat=0, soundOn=false;

const mat = (color, emissive=0x000000, intensity=0) => new THREE.MeshStandardMaterial({color, metalness:.1, roughness:.55, emissive, emissiveIntensity:intensity});
const glow = color => new THREE.MeshBasicMaterial({color, side:THREE.DoubleSide});
function mesh(geometry, material, parent, x=0,y=0,z=0){
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;
}
function cube(parent,w,h,d,color,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d), mat(color),parent,x,y,z)}
function ball(parent,r,color,x=0,y=0,z=0){return mesh(new THREE.SphereGeometry(r,12,9),mat(color),parent,x,y,z)}
function rod(parent,a,b,r,color){
  const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b), delta=bv.clone().sub(av);
  const m=mesh(new THREE.CylinderGeometry(r,r,delta.length(),9),mat(color),parent);
  m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
}
function makeText(lines,w,h,opts={}){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=384;
  const ctx=canvas.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor=opts.shadow||'#ff731a';ctx.shadowBlur=20;
  ctx.fillStyle=opts.color||'#ffe4a2';
  lines.forEach((line,i)=>{
    let size=opts.size||78;
    ctx.font=`900 ${size}px Impact, Arial Black, sans-serif`;
    while(ctx.measureText(line).width>935&&size>24){size-=2;ctx.font=`900 ${size}px Impact, Arial Black, sans-serif`;}
    ctx.fillText(line,512,lines.length===1?192:140+122*i);
  });
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:0}));
}

function makePerformer({color=0xf3a83c,skin=0xe9af83, skirt=false, mic=false}={}){
  const all=new THREE.Group(), rig=new THREE.Group();all.add(rig);
  // Anatomical volumes are real 3D geometry, not image planes.
  const torso=cube(rig,.072,.124,.046,color,0,.112,.005);
  if(skirt){mesh(new THREE.ConeGeometry(.065,.092,12),mat(color),rig,0,.039,.004).rotation.z=Math.PI;}
  const neck=cube(rig,.018,.022,.017,skin,0,.185,.004);
  ball(rig,.042,skin,0,.221,.006);
  const hair=mesh(new THREE.SphereGeometry(.045,12,8,0,Math.PI*2,0,Math.PI*.54),mat(0x21151d),rig,0,.24,.001);
  // Articulated arms and legs are parented to independently animated shoulder/hip pivots.
  const limbs={};
  for(const s of [-1,1]){
    const arm=new THREE.Group();arm.position.set(s*.047,.165,0);rig.add(arm);
    rod(arm,[0,0,0],[s*.015,-.085,.009],.012,skin);
    ball(arm,.014,skin,s*.015,-.085,.009);
    limbs[s<0?'leftArm':'rightArm']=arm;
    const leg=new THREE.Group();leg.position.set(s*.021,.058,0);rig.add(leg);
    rod(leg,[0,0,0],[s*.006,-.104,.007],.014,0x27243e);
    cube(leg,.035,.013,.055,0x15111c,s*.007,-.105,.028);
    limbs[s<0?'leftLeg':'rightLeg']=leg;
  }
  if(mic){
    // Handheld microphone in the singer's right hand.
    const arm=limbs.rightArm;
    rod(arm,[.012,-.082,.012],[.012,-.116,.02],.004,0xc9cbd2);
    ball(arm,.012,0x343444,.012,-.117,.02);
  }
  all.userData={rig,limbs,baseY:0,phase:0,skirt,mic};
  return all;
}
function makeSpeaker(parent,x){
  const g=new THREE.Group();g.position.set(x,-.004,.23);parent.add(g);
  cube(g,.11,.22,.09,0x16121a);
  for(const [y,r] of [[-.046,.033],[.061,.022]]){
    const tor=mesh(new THREE.TorusGeometry(r,.006,6,20),glow(GOLD),g,0,y,.05);
    mesh(new THREE.CircleGeometry(r*.72,20),glow(0x58243b),g,0,y,.051);
  }
}
function makeBeam(parent,x,phase){
  const g=new THREE.Group();g.position.set(x,.32,.15);parent.add(g);
  const head=mesh(new THREE.CylinderGeometry(.023,.03,.058,12),mat(0x302837),g);
  head.rotation.x=Math.PI/2;
  const cone=mesh(new THREE.ConeGeometry(.105,.43,18,1,true),new THREE.MeshBasicMaterial({color:x<0?ORANGE:PURPLE,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),g,0,-.19,.10);
  cone.rotation.z=Math.PI;
  spotlights.push({g,cone,phase});
}
function makeStage(rootGroup){
  const stageGroup=new THREE.Group();stageGroup.position.set(0,-.12,.16);rootGroup.add(stageGroup);
  cube(stageGroup,.86,.047,.37,0x371725,0,-.09,.13);
  cube(stageGroup,.87,.012,.38,0xff8c32,0,-.114,.13);
  cube(stageGroup,.82,.32,.027,0x1f122a,0,.135,-.027);
  cube(stageGroup,.92,.022,.055,0xd9a35b,0,.34,-.004);
  for(const x of [-.44,.44]){
    cube(stageGroup,.021,.36,.025,0x99634c,x,.155,-.006);
    makeSpeaker(stageGroup,x*.85);
  }
  for(let i=0;i<11;i++){
    const led=mesh(new THREE.BoxGeometry(.024,.060,.009),glow(i%2?ORANGE:PURPLE),stageGroup,-.30+i*.06,.12,-.009);
    leds.push(led);
  }
  for(let i=0;i<5;i++)makeBeam(stageGroup,-.35+i*.175,i*.9);
  return stageGroup;
}
function spawnSparkles(rootGroup){
  for(let i=0;i<22;i++){
    const p=mesh(new THREE.OctahedronGeometry(.005+(i%3)*.002,0),glow(i%3?GOLD:PURPLE),rootGroup);
    const a=i*2.4, r=.2+(i%7)*.045;
    p.position.set(Math.cos(a)*r,Math.sin(a)*.42,.36+(i%4)*.018);
    p.userData={base:p.position.clone(),phase:i*.63};sparkles.push(p);
  }
}
function buildAR(){
  mindar=new MindARThree({container:$('arContainer'),imageTargetSrc:'./assets/finale.mind',maxTrack:1,uiLoading:'yes',uiScanning:'no',uiError:'yes'});
  ({renderer,scene,camera}=mindar);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
  const anchor=mindar.addAnchor(0);root=anchor.group;
  scene.add(new THREE.AmbientLight(0xffffff,1.45));
  const key=new THREE.PointLight(ORANGE,2.5,4);key.position.set(.25,.65,.95);root.add(key);
  const fill=new THREE.PointLight(PURPLE,2.1,3);fill.position.set(-.4,.2,.9);root.add(fill);
  stage=makeStage(root);
  // Three separate 3D scenes: singer, solo dancer, and three-person group dance.
  const singer=makePerformer({color:0xe8a62f,skin:0xe9b58b,mic:true});singer.position.set(0,-.043,.25);stage.add(singer);
  const solo=makePerformer({color:0xaa5be8,skin:0xb98668,skirt:true});solo.position.set(0,-.043,.25);stage.add(solo);
  const group=[];
  for(let i=0;i<3;i++){
    const p=makePerformer({color:[0xed753e,0xc35ae4,0xf6bf53][i],skin:[0xd49b74,0xa9775b,0xe4b18c][i],skirt:i===1});
    p.position.set((i-1)*.23,-.043,.25);p.scale.setScalar(.87);p.userData.phase=i*1.2;stage.add(p);group.push(p);
  }
  performers=[singer,solo,...group];
  titlePlane=makeText(['NADANU 3.0','GRAND FINALE'],1.02,.30,{size:96});titlePlane.position.set(0,.46,.22);root.add(titlePlane);
  invitePlane=makeText(['YOU ARE CORDIALLY INVITED','WITNESS THE FINAL SHOWDOWN'],1.08,.30,{size:54,color:'#ffeab6'});invitePlane.position.set(0,-.53,.21);root.add(invitePlane);
  spawnSparkles(root);
  root.visible=false;
  anchor.onTargetFound=()=>{
    tracked=true;sequenceTime=0;currentAct=-1;root.visible=true;
    status.textContent='Invitation detected — welcome to NADANU 3.0!';
    if(soundOn)resumeMusic();
  };
  anchor.onTargetLost=()=>{
    tracked=false;root.visible=false;pauseMusic();
    status.textContent='Point your camera at the Grand Finale invitation';
    actLabel.textContent='SCANNING INVITATION';
  };
  renderer.setAnimationLoop(()=>{
    const now=performance.now()/1000;
    const dt=Math.min(.07,Math.max(0,now-lastFrame));lastFrame=now;
    if(running&&tracked){sequenceTime+=dt;animate(sequenceTime);}
    renderer.render(scene,camera);
  });
  initialized=true;
}
const acts=['SOLO SINGING','SOLO DANCING','GROUP DANCING','YOU ARE INVITED!'];
function animate(t){
  const reveal=THREE.MathUtils.smoothstep(t,0,1.65);
  stage.scale.setScalar(.05+.95*reveal);
  titlePlane.material.opacity=THREE.MathUtils.smoothstep(t,.2,1.3);
  invitePlane.material.opacity=THREE.MathUtils.smoothstep(t,12.5,14);
  titlePlane.position.y=.46+Math.sin(t*1.5)*.01;
  const loop=(t-1.7)%18;
  const phase=loop<0?0:loop<4.5?0:loop<9?1:loop<13.5?2:3;
  if(phase!==currentAct){currentAct=phase;actLabel.textContent=acts[phase];}
  performers.forEach((p,i)=>{p.visible=phase===0&&i===0||phase===1&&i===1||phase===2&&i>=2;
    if(!p.visible)return;
    const d=p.userData, {rig,limbs}=d, beatTime=t*5.3+d.phase;
    rig.position.y=Math.abs(Math.sin(beatTime))*(i===0?.008:.023);
    rig.rotation.z=Math.sin(beatTime*.54)*(i===0?.055:.15);
    rig.rotation.y=Math.sin(beatTime*.34)*.2;
    limbs.leftArm.rotation.z=Math.sin(beatTime)*.65+.2;
    limbs.rightArm.rotation.z=d.mic?-.95+Math.sin(beatTime*.52)*.14:-Math.sin(beatTime+.8)*.83-.15;
    limbs.leftLeg.rotation.z=Math.sin(beatTime)*.38;
    limbs.rightLeg.rotation.z=-Math.sin(beatTime)*.38;
  });
  if(phase===3){ // The 3D stage remains present behind the final invitation message.
    invitePlane.material.opacity=1;
  }else{
    invitePlane.material.opacity=0;
  }
  spotlights.forEach(({g,cone,phase:p})=>{
    g.rotation.z=Math.sin(t*1.7+p)*.42;
    cone.material.opacity=.09+.07*(.5+.5*Math.sin(t*3+p));
  });
  leds.forEach((m,i)=>{m.scale.y=.42+.85*(.5+.5*Math.sin(t*6+i*.85));});
  sparkles.forEach(p=>{p.position.y=p.userData.base.y+Math.sin(t*1.4+p.userData.phase)*.025;p.rotation.y=t*.6;});
}

// Original music generated live from oscillators; no copyrighted music or external audio file.
// Schedule short notes with Web Audio, initiated only by a direct user click.
const melody=[0,4,7,9,7,4,2,4,0,4,7,12,9,7,4,2];
function note(freq,start,len,volume=.025,type='triangle'){
  if(!audioCtx||!master)return;
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.value=freq;
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.012);
  gain.gain.exponentialRampToValueAtTime(.001,start+len);
  osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+len+.03);
}
function scheduleMusic(){
  if(!audioCtx||!soundOn||!tracked||!running)return;
  const bpm=112,step=60/bpm/2;
  while(nextBeat<audioCtx.currentTime+.12){
    const n=beat%16;
    // Original celebratory electronic melody, plus kick and hi-hat rhythm.
    note(220*Math.pow(2,melody[n]/12),nextBeat,step*.75,.023,'triangle');
    if(n%4===0)note(90,nextBeat,.17,.065,'sine');
    if(n%2===0)note(880,nextBeat,.045,.006,'square');
    if(n%8===4)note(135,nextBeat,.13,.028,'sawtooth');
    nextBeat+=step;beat++;
  }
}
async function enableMusic(){
  if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();master=audioCtx.createGain();master.gain.value=.42;master.connect(audioCtx.destination);}
  await audioCtx.resume();soundOn=true;audioBtn.textContent='MUTE MUSIC';
  nextBeat=audioCtx.currentTime+.05;
  if(!musicTimer)musicTimer=setInterval(scheduleMusic,55);
}
function pauseMusic(){if(master)master.gain.setTargetAtTime(0,audioCtx.currentTime,.025);}
function resumeMusic(){if(master){master.gain.setTargetAtTime(.42,audioCtx.currentTime,.025);nextBeat=audioCtx.currentTime+.06;}}
function disableMusic(){soundOn=false;audioBtn.textContent='PLAY MUSIC';pauseMusic();}

async function startAR(){
  if(working||running)return;working=true;startBtn.disabled=true;message.textContent='Starting camera...';
  try{
    const r=await fetch('./assets/finale.mind',{cache:'no-store'});
    if(!r.ok)throw new Error('Missing assets/finale.mind — copy your compiled invitation target.');
    if(!initialized)buildAR();
    // AudioContext is unlocked from this button gesture before camera async operations.
    await enableMusic();
    await mindar.start();running=true;lastFrame=performance.now()/1000;
    landing.style.display='none';arUI.hidden=false;status.textContent='Point camera at your printed B5 invitation';
  }catch(err){console.error(err);disableMusic();message.textContent=err.message||'Camera failed. Use HTTPS and allow camera permission.';
    if(mindar){try{await mindar.stop();}catch(_){}}
  }finally{working=false;startBtn.disabled=false;}
}
async function stopAR(){
  if(working||!running)return;working=true;
  try{await mindar.stop();running=false;tracked=false;disableMusic();root.visible=false;
    arUI.hidden=true;landing.style.display='grid';message.textContent='';
  }catch(err){console.error(err);status.textContent='Unable to stop camera — refresh the page.';}
  finally{working=false;}
}
startBtn.addEventListener('click',startAR);stopBtn.addEventListener('click',stopAR);
audioBtn.addEventListener('click',async()=>{if(soundOn)disableMusic();else{await enableMusic();if(tracked)resumeMusic();}});
window.addEventListener('pagehide',()=>{disableMusic();if(running&&mindar)mindar.stop().catch(()=>{});});
