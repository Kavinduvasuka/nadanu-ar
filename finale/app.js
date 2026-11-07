import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MindARThree } from 'mindar-image-three';
import { createAliveInvitation } from './invitation-alive.js';

// Nadanu 3.0: ORIGINAL Stage Lights concert geometry + real GLB actors, anchored to the invitation.
// Animations: singer.glb and solo-dancer.glb have embedded animation clips.
// group_dancers.glb is a STATIC mesh; it moves as a whole, not as rigged individuals.
const landing = document.querySelector('#landing');
const arContainer = document.querySelector('#arContainer');
const startButton = document.querySelector('#startButton');
const stopButton = document.querySelector('#stopButton');
const message = document.querySelector('#message');
const arUI = document.querySelector('#arUI');
const status = document.querySelector('#trackingStatus');
const invitationScanner=document.getElementById('invitationScanner');
const scannerMessage=document.getElementById('scannerMessage');
function showScanner(state='searching',text='Frame the printed Grand Finale invitation'){
 if(!invitationScanner)return;
 invitationScanner.hidden=false;
 invitationScanner.dataset.scanState=state;
 if(scannerMessage)scannerMessage.textContent=text;
 if(actBanner)actBanner.hidden=true;
 status.hidden=true;
}
function hideScanner(){
 if(invitationScanner)invitationScanner.hidden=true;
 if(actBanner)actBanner.hidden=showInvitation;
 status.hidden=false;
}
const clock = new THREE.Clock();
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
gltfLoader.setDRACOLoader(dracoLoader);
let mindarThree, initialized = false, running = false, busy = false, tracked = false;
let activeRenderer=null, activeAnchor=null, activeRoot=null, orbitControlsBound=false;
let stageTargetX=0,stageTargetY=0,stageTiltX=0,stageTiltY=0,stageSensorBase=null;
let filteredSensorX=0,filteredSensorY=0;
let frozenStageRoot=null,stagePoseCaptured=false;
let stableCamera=null;
let initialMarkerDistance=0,markerDistanceZoom=1,markerDistanceTarget=1;
const STAGE_SCREEN_COVERAGE=.68;
let targetLostAt=0,stageWasActive=false;
const TRACKING_GRACE_MS=550;
const posePosition=new THREE.Vector3(),poseRotation=new THREE.Quaternion(),poseScale=new THREE.Vector3();
let lastManualOrbitAt=0;
let trackerGeneration=0; // Invalidate late tracking events from a previous camera session.
let stage, warmLight, violetLight;
let neonRings=[], eqBars=[], particles, stageSpots=[], beamCones=[], showMode=null;
let selectedAct=null, soundEnabled=false;
const performers = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
const performerReady=[false,false,false],performerFailed=[false,false,false];
const performerNames=['Solo Singing','Solo Dancing','Group Dancing'];
const mixers = [];
let lastFrame=0, trackingTime=0, sequenceTime=0;
const ACT_SECONDS=8, TOTAL_ACTS=3;
const actNames=['SOLO SINGING','SOLO DANCING','GROUP DANCING'];
const actBanner=document.getElementById('actBanner');
const actBannerTitle=document.getElementById('actBannerTitle');
const actBannerCount=document.getElementById('actBannerCount');
let lastPresentedAct=-1;
function presentAct(index){
 if(lastPresentedAct===index)return;
 actBannerTitle.textContent=actNames[index];
 actBannerCount.textContent='ACT 0'+(index+1)+' / 03';
 lastPresentedAct=index;
}
const finaleInvitation=document.getElementById('finaleInvitation');
const replayActsButton=document.getElementById('replayActsButton');
let showInvitation=false;
let aliveInvitation=null;

const finaleMotion=document.getElementById('finaleMotion');
const finaleMotionFrame=document.getElementById('finaleMotionFrame');
const finaleMotionInfo=document.getElementById('finaleMotionInfo');
let finalMotionActive=false,motionAllowed=false,motionReference=null;
let finaleMotionUnlockedAt=0;
let finalX=0,finalY=0,smoothedX=0,smoothedY=0,motionFrame=0;
let finalZoom=1,zoomMotionAllowed=false,lastZoomMotionAt=0;
function setMotionStatus(text){if(finaleMotionInfo)finaleMotionInfo.textContent=text;}
// Calibrated against the device position when the invitation is first shown.
// iOS requires an explicit tap to allow orientation; Android may grant automatically.
let motionSamples=0, motionPermissionPending=false, lastMotionEventAt=0;
const arTiltButton=document.getElementById('arEnableTilt');
const arTiltStatus=document.getElementById('arTiltStatus');
function updateARTiltStatus(message,enableButton=false){
 if(arTiltStatus)arTiltStatus.textContent=message;
 if(arTiltButton)arTiltButton.hidden=!enableButton;
}
function receiveMotion(event){
 if(!motionAllowed || !Number.isFinite(event.gamma) || !Number.isFinite(event.beta))return;
 motionSamples++;
 lastMotionEventAt=performance.now();
 if(running && stagePoseCaptured && introCompleted && !showInvitation){
  if(!stageSensorBase){
   stageSensorBase={gamma:event.gamma,beta:event.beta};
   updateARTiltStatus('PHONE TILT ACTIVE · MOVE PHONE TO VIEW PERFORMERS');
  }
  if(performance.now()-lastManualOrbitAt>2200){
   const diffGamma=((event.gamma-stageSensorBase.gamma+540)%360)-180;
   const diffBeta=((event.beta-stageSensorBase.beta+540)%360)-180;
   // Ignore sensor noise below ~3 degrees. Low-pass orientation updates
   // so a shaky hand does not make the entire stage vibrate.
   const deadZone=angle=>Math.sign(angle)*Math.max(0,Math.abs(angle)-3);
   const desiredY=THREE.MathUtils.clamp(deadZone(diffGamma)*.019,-1.25,1.25);
   const desiredX=THREE.MathUtils.clamp(-deadZone(diffBeta)*.013,-.42,.42);
   filteredSensorY+=(desiredY-filteredSensorY)*.09;
   filteredSensorX+=(desiredX-filteredSensorX)*.09;
   if(Math.abs(filteredSensorY-stageTargetY)>.006)stageTargetY=filteredSensorY;
   if(Math.abs(filteredSensorX-stageTargetX)>.006)stageTargetX=filteredSensorX;
  }
 }
 if(!finalMotionActive || !finaleSceneReady || performance.now()<finaleMotionUnlockedAt)return;
 if(!motionReference)motionReference={gamma:event.gamma,beta:event.beta};
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 finalY=clamp((event.gamma-motionReference.gamma)*.011,-.30,.30);
 finalX=clamp(-(event.beta-motionReference.beta)*.008,-.23,.23);
 if(motionSamples===1 || motionSamples%120===0)setMotionStatus('PHONE TILT ACTIVE · MOVE YOUR PHONE OR DRAG');
}
function receiveZoomMotion(event){
 if(!zoomMotionAllowed||!finalMotionActive||!finaleSceneReady||performance.now()<finaleMotionUnlockedAt)return;
 // DeviceMotion acceleration approximates a push/pull gesture, not true depth.
 // Use gravity-free readings to keep stationary or tilted phones stable.
 const z=event.acceleration?.z;
 if(!Number.isFinite(z))return;
 const now=performance.now();
 if(now-lastZoomMotionAt<45)return;
 lastZoomMotionAt=now;
 const strength=Math.max(0,Math.abs(z)-1.35);
 if(strength<.15)return;
 const impulse=Math.sign(-z)*Math.min(strength,5)*.0025;
 finalZoom=THREE.MathUtils.clamp(finalZoom+impulse,.90,1.12);
}
function requestZoomMotionPermission(){
 if(!('DeviceMotionEvent' in window))return;
 try{
  const permission=typeof DeviceMotionEvent.requestPermission==='function'
   ?DeviceMotionEvent.requestPermission():Promise.resolve('granted');
  Promise.resolve(permission).then(value=>{
   zoomMotionAllowed=value==='granted';
   if(zoomMotionAllowed){
    window.removeEventListener('devicemotion',receiveZoomMotion,true);
    window.addEventListener('devicemotion',receiveZoomMotion,true);
   }
  }).catch(error=>console.warn('Motion zoom permission:',error));
 }catch(error){console.warn('Motion zoom permission:',error)}
}
function requestMotionFromStartGesture(){
 // Request motion access inside the same user gesture on iOS.
 requestZoomMotionPermission();
 if(!('DeviceOrientationEvent' in window)){
  motionAllowed=false;
  updateARTiltStatus('TILT SENSOR NOT AVAILABLE · DRAG TO ROTATE',false);
  setMotionStatus('PHONE SENSOR UNAVAILABLE · DRAG TO TILT');
  return;
 }
 if(motionPermissionPending)return;
 motionPermissionPending=true;
 try{
  const result=typeof DeviceOrientationEvent.requestPermission==='function'
    ?DeviceOrientationEvent.requestPermission():Promise.resolve('granted');
  Promise.resolve(result).then(value=>{
   motionAllowed=value==='granted';
   if(motionAllowed){
    motionSamples=0;motionReference=null;stageSensorBase=null;filteredSensorX=filteredSensorY=0;lastMotionEventAt=0;
    window.removeEventListener('deviceorientation',receiveMotion,true);
    window.addEventListener('deviceorientation',receiveMotion,true);
    updateARTiltStatus('TILT ALLOWED · CALIBRATING…',false);
    setMotionStatus('PHONE TILT ENABLED · MOVE PHONE OR DRAG');
    document.getElementById('finaleEnableTilt').hidden=true;
  }else{
    updateARTiltStatus('ALLOW PHONE TILT TO ROTATE PERFORMERS',true);
    setMotionStatus('ENABLE PHONE TILT OR DRAG TO EXPLORE');
    document.getElementById('finaleEnableTilt').hidden=false;
  }
  }).catch(error=>{
   console.warn('Orientation permission:',error);
   motionAllowed=false;
   updateARTiltStatus('TILT PERMISSION NEEDED · TAP ENABLE',true);
   setMotionStatus('TAP ENABLE PHONE TILT OR DRAG');
   document.getElementById('finaleEnableTilt').hidden=false;
  }).finally(()=>{motionPermissionPending=false;});
 }catch(error){
  motionPermissionPending=false;
  motionAllowed=false;
  console.warn('Orientation permission:',error);
  updateARTiltStatus('TILT PERMISSION NEEDED · TAP ENABLE',true);
  document.getElementById('finaleEnableTilt').hidden=false;
 }
}
function forwardMotion(){
 if(!finalMotionActive)return;
 if(finaleSceneReady && performance.now()>=finaleMotionUnlockedAt){
  smoothedX+=(finalX-smoothedX)*.20;
  smoothedY+=(finalY-smoothedY)*.20;
  finaleMotionFrame?.contentWindow?.postMessage({type:'nadanu-motion',x:smoothedX,y:smoothedY,zoom:finalZoom},location.origin);
 }
 motionFrame=requestAnimationFrame(forwardMotion);
}
let finaleSceneReady=false;
let finalePreloaded=false;
const CINEMATIC_FRAME_URL='./cinematic/embed.html?v=depth-enhance-20261107-4';
function preloadFinaleScene(){
 if(finalePreloaded)return;
 finalePreloaded=true;
 // Keep an offscreen, full-size frame alive so mobile browsers can load and
 // render WebGL before the finale, instead of suspending a display:none iframe.
 finaleMotion.hidden=false;
 finaleMotion.classList.add('prewarming');
 finaleMotionFrame.src=CINEMATIC_FRAME_URL;
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==finaleMotionFrame?.contentWindow)return;
 if(event.data?.type!=='nadanu-scene-ready')return;
 finaleSceneReady=true;
 if(!finalMotionActive)return;
 // New invitation always starts front-facing and fitted inside the screen.
 finaleMotionUnlockedAt=performance.now()+1200;
 motionReference=null;
 smoothedX=smoothedY=finalX=finalY=0;finalZoom=1;
 finaleMotionFrame?.contentWindow?.postMessage({type:'nadanu-reset-view',fit:true},location.origin);
 finaleMotion.classList.add('scene-ready');
});
async function revealFinalMotion(){
 if(finalMotionActive)return;
 finalMotionActive=true;
 finaleMotionUnlockedAt=Infinity;
 if(!finalePreloaded)preloadFinaleScene();
 resetStageView(); // Clear concert orbit and zoom before the final invitation.
 finaleMotion.classList.remove('prewarming');
 // Keep a fully-prepared 3D invitation visible immediately at handoff.
 if(finaleSceneReady){
  finaleMotion.classList.add('scene-ready');
  motionReference=null;smoothedX=smoothedY=finalX=finalY=0;finalZoom=1;
  finaleMotionUnlockedAt=performance.now()+1200;
  finaleMotionFrame.contentWindow?.postMessage({type:'nadanu-reset-view',fit:true},location.origin);
 }else{
  finaleMotion.classList.remove('scene-ready');
 }
 running=false;tracked=false;
 if(invitationScanner)invitationScanner.hidden=true;
 if(recognitionIntro)recognitionIntro.hidden=true;
 arUI.hidden=true;
 // Show the cached original image immediately, before waiting for camera shutdown.
 finaleMotion.hidden=false;
 setMotionStatus(motionAllowed?'MOVE PHONE OR DRAG TO EXPLORE 3D':'ENABLE PHONE TILT OR DRAG TO EXPLORE');
 document.getElementById('finaleEnableTilt').hidden=motionAllowed;
 smoothedX=smoothedY=finalX=finalY=0;finalZoom=1;
 motionReference=null;
 cancelAnimationFrame(motionFrame);
 motionFrame=requestAnimationFrame(forwardMotion);
 try{await disposeARSession();}catch(error){console.warn('Camera shutdown before invitation:',error);}
 if(!finalMotionActive)return;
 arContainer.style.display='none';
 if(!finaleMotionFrame.getAttribute('src'))preloadFinaleScene();
 if(finaleSceneReady){
  finaleMotionUnlockedAt=performance.now()+1200;
  motionReference=null;smoothedX=smoothedY=finalX=finalY=0;finalZoom=1;
  finaleMotionFrame.contentWindow?.postMessage({type:'nadanu-reset-view',fit:true},location.origin);
  finaleMotion.classList.add('scene-ready');
 }
}

// Confirm invitation with a logo reveal before any actors are visible.
// If tracking is lost midway, replay the reveal on reacquisition.
const recognitionIntro=document.getElementById('recognitionIntro');
const INTRO_DURATION_MS=2700;
let introStartedAt=0,introCompleted=false;
function resetRecognitionIntro(){
 introStartedAt=0;introCompleted=false;
 if(recognitionIntro)recognitionIntro.hidden=true;
}
function startRecognitionIntro(){
 if(introStartedAt||introCompleted||!tracked||!running)return;
 introStartedAt=performance.now();
 hideScanner();
 if(recognitionIntro){
  recognitionIntro.hidden=true;
  void recognitionIntro.offsetWidth;
  recognitionIntro.hidden=false;
 }
 if(actBanner)actBanner.hidden=true;
 status.textContent='Invitation recognized · welcome to Nadanu 3.0';
}
function finishRecognitionIntro(){
 if(introCompleted)return;
 introCompleted=true;introStartedAt=0;
 if(recognitionIntro)recognitionIntro.hidden=true;
 hideScanner();
 status.textContent='Welcome to Nadanu 3.0 · your AR show begins';
}
function resetPerformances(){
 lastPresentedAct=-1;
 actBanner.hidden=false;
 presentAct(0);
 sequenceTime=0;
 showInvitation=false;
 if(aliveInvitation)aliveInvitation.root.visible=false;
 if(finaleInvitation)finaleInvitation.hidden=true;
}
replayActsButton?.addEventListener('click',()=>{
 selectedAct=null;
 document.querySelectorAll('[data-act]').forEach(b=>b.classList.toggle('active',b.dataset.act==='auto'));
 resetPerformances();
});
// The 3D performers remain fixed to the invitation, allowing natural side views.
const orbit={zoom:1,pointers:new Map(),distance:0};
const BASE_SCALE=0.115; // Compact mini-stage: keep floor and actors in the camera frame.
// The real image-anchor pose determines camera perspective in Three.js.
const fixedStageTilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(.42,0,0));
function resetStageView(){
 orbit.zoom=1;markerDistanceZoom=markerDistanceTarget=1;initialMarkerDistance=0;stageTargetX=stageTargetY=stageTiltX=stageTiltY=0;filteredSensorX=filteredSensorY=0;stageSensorBase=null;lastManualOrbitAt=0;
 if(stage)stage.quaternion.copy(fixedStageTilt);
 applyOrbit();
}
function applyOrbit(){
 // Rotate the entire mini-concert together: performers stay firmly on
 // the stage floor instead of twisting independently in mid-air.
 performers.forEach((group,i)=>{
   group.rotation.set(0,0,0);
   group.scale.setScalar((i===2?2.05:3.85)*orbit.zoom);
 });
}
function bindOrbitControls(){
 if(orbitControlsBound)return;
 orbitControlsBound=true;
 // Capture pointer events on the whole AR view. The scanner/HUD is layered above
 // #arContainer, so listening only on the canvas misses ordinary finger drags.
 const pointers=orbit.pointers;
 const interactive=e=>e.target?.closest?.('button,a,input,select,textarea,dialog');
 document.addEventListener('pointerdown',e=>{
  if(!running||!stagePoseCaptured||!introCompleted||showInvitation||interactive(e))return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  lastManualOrbitAt=performance.now();
  if(pointers.size===2)orbit.distance=0;
 },true);
 document.addEventListener('pointermove',e=>{
  if(!running||!stagePoseCaptured||!introCompleted||!pointers.has(e.pointerId))return;
  if(e.cancelable)e.preventDefault();
  const old=pointers.get(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1){
   stageTargetY=THREE.MathUtils.clamp(stageTargetY+(e.clientX-old.x)*.012,-1.4,1.4);
   stageTargetX=THREE.MathUtils.clamp(stageTargetX+(e.clientY-old.y)*.006,-.48,.48);
   lastManualOrbitAt=performance.now();
  }else if(pointers.size===2){
   const [a,b]=[...pointers.values()];
   const distance=Math.hypot(a.x-b.x,a.y-b.y);
   if(orbit.distance>0)orbit.zoom=THREE.MathUtils.clamp(orbit.zoom*distance/orbit.distance,.65,2.1);
   orbit.distance=distance;
  }
 },true);
 const release=e=>{pointers.delete(e.pointerId);orbit.distance=0;};
 document.addEventListener('pointerup',release,true);
 document.addEventListener('pointercancel',release,true);
 window.addEventListener('blur',()=>{pointers.clear();orbit.distance=0;});
 document.querySelector('#arContainer')?.addEventListener('wheel',e=>{
  if(!running)return;
  e.preventDefault();
  orbit.zoom=THREE.MathUtils.clamp(orbit.zoom*Math.exp(-e.deltaY*.001),.65,2.1);
 },{passive:false});
 document.querySelector('#resetViewButton')?.addEventListener('click',resetStageView);
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
  stage.rotation.x=.42; // Base presentation tilt, stabilized against tracker wobble below.
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
  {path:'./assets/solo-dancer.glb?v=optimized-20261106',index:1,height:2.25,x:0.55,z:0,maxWidth:3,name:'Solo dancer'},
  {path:'./assets/group_dancers.glb',index:2,height:2.6,x:0,z:0,maxWidth:6.7,name:'Group dancers'}
 ];
 // Load performers one at a time after the live camera opens. Concurrent
 // Draco decode on mobile can block video rendering and look like a frozen stage.
 const results=[];
 for(const a of assets){
  try{
  const gltf=await gltfLoader.loadAsync(a.path);
  const {wrap,object}=normalizeGLB(gltf,a.height,a.x,a.z,a.maxWidth);
  performers[a.index].add(wrap);
  performerReady[a.index]=true;
  if(gltf.animations.length){
   const mixer=new THREE.AnimationMixer(object);
   const action=mixer.clipAction(gltf.animations[0]);
   action.setLoop(THREE.LoopRepeat,Infinity);action.play();mixers.push(mixer);
  }
  console.info(`${a.name}: ${gltf.animations.length} animation clip(s)`);
  }catch(err){
   performerFailed[a.index]=true;
   console.error(`Failed to load ${a.name}:`,err);
   results.push(`${a.name}: ${err?.message||String(err)}`);
  }
  // Allow camera rendering and target tracking to process between models.
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 return results;
}

function setup() {
 const generation=++trackerGeneration;
 tracked=false;
 mindarThree=new MindARThree({container:document.querySelector('#arContainer'),imageTargetSrc:'./assets/finale.mind?v=eaee01ad',maxTrack:1,filterMinCF:0.0001,filterBeta:0.1,warmupTolerance:8,missTolerance:12,uiLoading:'no',uiScanning:'no',uiError:'yes'});
 const {scene,renderer,camera}=mindarThree;
 activeRenderer=renderer;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.2));
 const anchor=mindarThree.addAnchor(0),root=anchor.group;
 activeAnchor=anchor;activeRoot=root;
 // Hybrid AR: preserve the working scene and camera projection.
 // After recognition, the marker becomes a visibility gate, not a pose driver.
 scene.add(camera);
 stableCamera=camera;
 frozenStageRoot=new THREE.Group();frozenStageRoot.visible=false;scene.add(frozenStageRoot);
 stagePoseCaptured=false;
 scene.add(new THREE.HemisphereLight(0xffffff,0x34132a,2.8));
 warmLight=new THREE.PointLight(0xffa245,3,3);warmLight.position.set(.5,.45,.55);frozenStageRoot.add(warmLight);
 violetLight=new THREE.PointLight(0xa05bff,2,3);violetLight.position.set(-.5,.36,.5);frozenStageRoot.add(violetLight);
 createStage(frozenStageRoot);
 aliveInvitation=createAliveInvitation(frozenStageRoot);
 bindOrbitControls();
 root.visible=false;
 anchor.onTargetFound=()=>{
  if(generation!==trackerGeneration)return; // Ignore callbacks from disposed camera.
  const firstLock=!stagePoseCaptured;
  tracked=true;targetLostAt=0;
  if(firstLock){
   trackingTime=performance.now();
   resetStageView();
   stage.visible=false;
   frozenStageRoot.visible=false;
   showScanner('locked','Invitation detected · stabilizing stage…');
   status.textContent='Invitation detected · stabilizing tracking…';
  } else if(introCompleted) {
   hideScanner();
  }
  root.visible=false; // Tracking-only anchor; stage uses a filtered copy of its pose.
 };
 anchor.onTargetLost=()=>{
  if(generation!==trackerGeneration)return;
  tracked=false;
  targetLostAt=performance.now();
  // Short interruptions are tolerated. The render loop pauses and hides the
  // stage only after the invitation has genuinely been lost for a moment.
  root.visible=false;
 };
 renderer.setAnimationLoop(()=>{
  if(generation!==trackerGeneration||!running)return;
  const now=clock.getElapsedTime();const dt=Math.min(.05,Math.max(0,now-lastFrame));lastFrame=now;
  // MindAR can retain an old anchor matrix temporarily on iOS. Hide both the
  // complete stage and its lights until NEW invitation tracking has stabilized.
  const locked=tracked && performance.now()-trackingTime>=650;
  const inGrace=!tracked && stagePoseCaptured && targetLostAt>0 && performance.now()-targetLostAt<TRACKING_GRACE_MS;
  if(locked && introCompleted && invitationScanner && !invitationScanner.hidden)hideScanner();
  if(locked && !introCompleted && !introStartedAt)startRecognitionIntro();
  if(locked && introStartedAt && performance.now()-introStartedAt>=INTRO_DURATION_MS)finishRecognitionIntro();
  // Capture ONE valid marker pose; attach the complete existing stage to the
  // camera without jumping. Future image pose jitter no longer moves the stage.
  if(locked && !stagePoseCaptured && frozenStageRoot && stableCamera){
   root.updateWorldMatrix(true,false);
   root.matrixWorld.decompose(posePosition,poseRotation,poseScale);
   initialMarkerDistance=Math.abs(posePosition.z);
   if(Number.isFinite(posePosition.x)&&Number.isFinite(posePosition.y)&&Number.isFinite(posePosition.z)){
    frozenStageRoot.position.copy(posePosition);
    frozenStageRoot.quaternion.copy(poseRotation);
    frozenStageRoot.scale.copy(poseScale);
    stableCamera.attach(frozenStageRoot);
    // Maintain visible initial pose but fit the stage inside portrait screens.
    if(stableCamera.isPerspectiveCamera && frozenStageRoot.position.z < -.15){
     const depth=-frozenStageRoot.position.z;
     const viewHeight=2*depth*Math.tan(THREE.MathUtils.degToRad(stableCamera.fov)*.5);
     const viewWidth=viewHeight*stableCamera.aspect;
     const naturalDiameter=20*BASE_SCALE;
     const fit=Math.min(1,(Math.min(viewWidth,viewHeight)*STAGE_SCREEN_COVERAGE)/Math.max(.01,naturalDiameter));
     if(Number.isFinite(fit)&&fit>0){
      frozenStageRoot.scale.multiplyScalar(Math.max(.15,fit));
      const safeX=Math.max(0,(viewWidth-naturalDiameter*fit)*.45);
      const safeY=Math.max(0,(viewHeight-naturalDiameter*fit)*.40);
      frozenStageRoot.position.x=THREE.MathUtils.clamp(frozenStageRoot.position.x,-safeX,safeX);
      // Keep the miniature concert below the centre, clear of the top HUD.
      frozenStageRoot.position.y=-Math.max(viewHeight*.11,Math.min(safeY,viewHeight*.16));
     }
    }
    stagePoseCaptured=true;
    stageSensorBase=null;
   }
  }
  // Read live image-marker depth for real approach/retreat zoom.
  // Do NOT follow marker translation or rotation (camera-locked stability).
  if(locked && stagePoseCaptured && initialMarkerDistance>.1){
   root.updateWorldMatrix(true,false);
   const currentDepth=Math.abs(root.matrixWorld.elements[14]);
   if(Number.isFinite(currentDepth)&&currentDepth>.1){
    const desired=THREE.MathUtils.clamp(initialMarkerDistance/currentDepth,.78,1.38);
    // Ignore less than 2.2% change to suppress camera tracking noise.
    if(Math.abs(desired-markerDistanceTarget)>.022)markerDistanceTarget=desired;
   }
  }
  const showStage=(locked||inGrace) && introCompleted && stagePoseCaptured;
  if(showStage && motionAllowed && motionSamples===0 && performance.now()-trackingTime>2400){
   updateARTiltStatus('NO TILT DATA · CHECK MOTION ACCESS OR DRAG',true);
  }
  if(!showStage && stageWasActive && !showInvitation && !tracked){
   showScanner('searching','Invitation lost · stage paused. Frame the artwork to resume.');
   status.textContent='Invitation lost · stage paused';
  }
  stageWasActive=showStage;
  root.visible=false;
  if(frozenStageRoot)frozenStageRoot.visible=showStage;
  stage.visible=showStage && !showInvitation;
  if(aliveInvitation){aliveInvitation.root.visible=showStage && showInvitation;if(aliveInvitation.root.visible)aliveInvitation.update(dt);}
  if(showStage){
    // Keep local stage orientation constant while MindAR tracks the invitation.
    // Moving around the invitation creates genuine perspective and parallax.
    // Slow, frame-rate-independent damping: stable even if mobile FPS varies.
    const smoothing=1-Math.exp(-3.2*dt);
    stageTiltX+=(stageTargetX-stageTiltX)*smoothing;
    stageTiltY+=(stageTargetY-stageTiltY)*smoothing;
    // Smooth 3D orbit of the full stage + performers in screen-locked hybrid AR.
    // Keep the camera-space stage position fixed to avoid marker tracking jitter.
    stage.quaternion.setFromEuler(new THREE.Euler(.42+stageTiltX,stageTiltY,0,'XYZ'));
    // Preserve each 8-second act until its GLB has fully loaded.
    // A slow first download must never silently skip the solo dancer.
    const activeAutoAct=Math.min(TOTAL_ACTS-1,Math.floor(sequenceTime/ACT_SECONDS));
    const canAdvance=performerReady[activeAutoAct]||performerFailed[activeAutoAct];
    if(tracked&&!showInvitation&&selectedAct===null&&canAdvance)sequenceTime+=dt;
    // Load cinematic artwork before the last performance ends.
    if(sequenceTime>=ACT_SECONDS+1&&!finalePreloaded&&performerReady[2])preloadFinaleScene();
    // One complete three-act showcase, followed by the formal invitation.
    if(selectedAct===null && sequenceTime>=ACT_SECONDS*TOTAL_ACTS && !showInvitation){
      showInvitation=true;
      actBanner.hidden=true;
      void revealFinalMotion();
    }
    const index=selectedAct===null
      ? Math.min(TOTAL_ACTS-1,Math.floor(sequenceTime/ACT_SECONDS))
      : selectedAct;
    if(!showInvitation)presentAct(index);
    performers.forEach((p,i)=>p.visible=!showInvitation && i===index && performerReady[i]);
    if(!showInvitation&&!performerReady[index]){
      status.textContent=performerFailed[index]
        ? `${performerNames[index]} model unavailable — try refreshing the page.`
        : `Preparing ${performerNames[index]} 3D model…`;
    }
    if(tracked)for(const mixer of mixers)mixer.update(dt);
    // Apply explicit visual rotation to the performers, not the stage.
    applyOrbit();
    // Lock to the invitation centre; delay the first reveal to avoid acquisition bounce.
    // No stage orbit or dynamic resizing after lock.
    if(performerReady[index] && status.textContent.startsWith('Invitation detected')){
      status.textContent='Stage ready · move sideways for a 3D view · pinch to zoom';
    }
    markerDistanceZoom+=(markerDistanceTarget-markerDistanceZoom)*(1-Math.exp(-2.0*dt));
    stage.scale.setScalar(BASE_SCALE*markerDistanceZoom);
    warmLight.position.x=.38*Math.sin(now*1.4);violetLight.position.x=.38*Math.cos(now*1.2);
    updateStageEffects(now,dt,index);
  }
  renderer.render(scene,camera);
 });
 initialized=true;
}
let modelErrors=[];
// Camera-first startup: do not download/decode the large GLB performers while
// MindAR opens the camera and compiles the tracking target on mobile phones.
message.textContent='Tap Start Invitation AR to open your camera.';
let performersPromise=null;
function ensurePerformersLoaded(){
 if(!performersPromise)performersPromise=loadPerformers();
 return performersPromise;
}
// Warm just the small tracking target through browser cache, without decoding GLBs.
fetch('./assets/finale.mind?v=eaee01ad',{priority:'high'}).then(r=>{
 if(!r.ok)throw new Error('Tracking target HTTP '+r.status);
 return r.arrayBuffer();
}).catch(e=>console.warn('Invitation tracking target prefetch failed:',e));
async function startAR(){
 if(busy||running)return;busy=true;startButton.disabled=true;message.textContent='Opening camera… allow camera access when prompted.';
 try{
  // No duplicate blocking fetch here: MindAR uses the browser-cached target.
  const cam = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  if(!window.isSecureContext || !cam) throw new Error('Camera requires localhost or HTTPS in a compatible browser.');
  console.info('Secure context:',window.isSecureContext,'Three revision:',THREE.REVISION);

  // Make the camera layer available before MindAR measures its dimensions.
  arContainer.style.display='block';
  resetRecognitionIntro();
  updateARTiltStatus(motionAllowed?'TILT ALLOWED · MOVE PHONE':'TAP ENABLE PHONE TILT',!motionAllowed);
  // Show the custom scanner before MindAR starts; avoid blank loading screens.
  landing.style.display='none';
  arUI.hidden=false;
  showScanner('preparing','Opening camera… allow camera access when prompted.');
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
  // Begin this session at Act 1 and a fresh animation clock.
  running=true;clock.start();lastFrame=clock.getElapsedTime();
  mixers.forEach(m=>m.setTime(0));
  resetPerformances();
  if(!tracked)showScanner('searching','Align the Grand Finale invitation inside the frame');
  else showScanner('locked','Invitation detected · stabilizing stage…');
  status.textContent='Camera ready. Point at the Grand Finale invitation';
  // Models now load after the camera starts, so video startup is not blocked
  // by Draco / WebP decoding or multiple concurrent model downloads.
  // Give the camera a few live frames before downloading/decoding models.
  setTimeout(()=>{
   if(!running)return;
   ensurePerformersLoaded().then(errors=>{
     modelErrors=errors;
     if(!running)return;
     if(errors.length)console.warn('3D models unavailable:',errors);
   }).catch(err=>{console.error('Model loading failed:',err);});
  },650);
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
   arContainer.style.display='none';
   arUI.hidden=true;
   landing.style.display='block';
   resetRecognitionIntro();
   if(invitationScanner)invitationScanner.hidden=true;
   disableSound();
   await disposeARSession();
   console.info('MindAR startup did not complete. Reload before retrying; inspect the FIRST console error.');
 }
 finally{busy=false;startButton.disabled=false;}
}
// Rebuild the MindAR controller after exit: a reused iOS camera tracker can
// leave its old anchor transform visible even when the invitation is absent.
async function disposeARSession(){
 ++trackerGeneration; // Old tracker must never re-show the stage on callbacks.
 const instance=mindarThree,renderer=activeRenderer,anchor=activeAnchor,root=activeRoot;
 if(anchor){anchor.onTargetFound=null;anchor.onTargetLost=null;}
 if(root)root.visible=false;
 if(stage)stage.visible=false;
 try{
  if(instance)await instance.stop();
 }catch(err){
  console.warn('MindAR shutdown warning:',err);
 }finally{
  initialMarkerDistance=0;markerDistanceZoom=markerDistanceTarget=1;
  if(frozenStageRoot){frozenStageRoot.visible=false;frozenStageRoot.parent?.remove(frozenStageRoot);frozenStageRoot=null;stagePoseCaptured=false;targetLostAt=0;stageWasActive=false;stableCamera=null;}
  if(renderer){
   try{renderer.setAnimationLoop(null);}catch(_){}
   try{renderer.dispose();}catch(_){}
  }
  // Explicitly release camera tracks if the library retained the video.
  for(const video of arContainer.querySelectorAll('video')){
   try{video.pause();}catch(_){}
   try{video.srcObject?.getTracks().forEach(track=>track.stop());}catch(_){}
   try{video.srcObject=null;}catch(_){}
  }
  if(aliveInvitation){aliveInvitation.dispose();aliveInvitation=null;}
  arContainer.replaceChildren();
  arContainer.style.display='none';
  mindarThree=null;activeRenderer=null;activeAnchor=null;activeRoot=null;
  initialized=false;tracked=false;stageSensorBase=null;stagePoseCaptured=false;
  orbit.pointers.clear();orbit.distance=0;orbit.zoom=1;
  applyOrbit();
  clock.stop();lastFrame=0;trackingTime=0;
 }
}
async function stopAR(){
 if(busy||!running)return;
 busy=true;
 running=false;
 tracked=false;
 arUI.hidden=true;
 if(invitationScanner)invitationScanner.hidden=true;
 resetRecognitionIntro();
 arContainer.style.display='none';
 landing.style.display='block';
 disableSound();
 resetPerformances();
 selectedAct=null;
 message.textContent='';
 try{await disposeARSession();}
 finally{busy=false;}
}
startButton.addEventListener('click',()=>{
 // The SAME user tap requests motion and camera. iOS may show separate prompts.
 requestMotionFromStartGesture();
 enableSound().catch(e=>console.warn('Audio could not start:',e));
 startAR();
});
function closeFinalMotion(){
 finalMotionActive=false;cancelAnimationFrame(motionFrame);finalZoom=1;
 finaleMotion.classList.remove('scene-ready','prewarming');
 finaleMotion.hidden=true;
 finaleMotionFrame.removeAttribute('src');
 finalePreloaded=false;finaleSceneReady=false;
 disableSound();resetPerformances();selectedAct=null;
 landing.style.display='block';message.textContent='';
}
document.getElementById('finaleEnableTilt')?.addEventListener('click',requestMotionFromStartGesture);
arTiltButton?.addEventListener('click',requestMotionFromStartGesture);
document.getElementById('finaleResetTilt')?.addEventListener('click',()=>{
 motionReference=null;finalX=finalY=smoothedX=smoothedY=0;finalZoom=1;
 finaleMotionUnlockedAt=performance.now()+900;
 finaleMotionFrame?.contentWindow?.postMessage({type:'nadanu-reset-view',fit:true},location.origin);
 setMotionStatus(motionAllowed?'VIEW RESET · MOVE PHONE TO TILT':'VIEW RESET · DRAG TO TILT');
});
document.getElementById('finaleMotionClose')?.addEventListener('click',closeFinalMotion);
document.getElementById('finaleMotionBack')?.addEventListener('click',closeFinalMotion);
document.getElementById('finaleMotionReplay')?.addEventListener('click',()=>{
 closeFinalMotion();startAR();
});
stopButton.addEventListener('click',stopAR);
document.getElementById('arBackToSite')?.addEventListener('click',stopAR);
document.getElementById('backToWebsiteButton')?.addEventListener('click',stopAR);
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
// NADANU ORIGINAL SOUNDTRACK (the same retro score already used on Auditions).
// Play from the Start AR user gesture, so iOS Safari permits unmuted playback.
// Audio is independent of the heavy 3D models and never blocks camera setup.
const soundButton=document.getElementById('soundButton');
const soundtrack=new Audio('../auditions/assets/nadanu-retro-score.m4a');
soundtrack.preload='none'; // Delay network work until the visitor actually starts AR.
soundtrack.loop=true;
soundtrack.volume=.95; // Louder than the Auditions page's .72 volume.
soundtrack.playsInline=true;
function updateSoundButton(){
 if(!soundButton)return;
 soundButton.textContent=soundEnabled?'SOUND ON':'SOUND OFF';
 soundButton.setAttribute('aria-pressed',String(soundEnabled));
}
function disableSound(){
 soundEnabled=false;
 soundtrack.pause();
 try{soundtrack.currentTime=0;}catch(_){}
 updateSoundButton();
}
function enableSound(){
 if(soundEnabled)return Promise.resolve();
 soundEnabled=true;
 updateSoundButton();
 // Call play() synchronously within the click handler, before any await.
 return soundtrack.play().catch(err=>{
  soundEnabled=false;
  updateSoundButton();
  console.warn('Soundtrack could not play:',err);
 });
}
soundButton?.addEventListener('click',()=>{
 if(soundEnabled)disableSound();
 else enableSound();
});
soundtrack.addEventListener('error',()=>{
 console.warn('Nadanu soundtrack could not load; check the audio asset.');
 soundEnabled=false;
 updateSoundButton();
});
updateSoundButton();

// AR module initialized: lets the landing page distinguish loading errors from camera issues.
window.__nadanuARReady = true;
