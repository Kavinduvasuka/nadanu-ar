import * as THREE from 'three';
import { createAliveInvitation } from './invitation-alive.js';
import { createTiltPerformances } from './tilt-performances.js';

// Nadanu 3.0 — hybrid camera background and motion tilt with 3 original GLB acts.
// One Start gesture initiates both permission requests; browsers can show two prompts.
const launch=document.querySelector('#startButton');
const landing=document.querySelector('#landing');
const viewer=document.querySelector('#tiltViewer');
const canvas=document.querySelector('#tiltCanvas');
const video=document.querySelector('#tiltCamera');
const actTitle=document.querySelector('#tiltActTitle');
const close=document.querySelector('#tiltClose');
const reset=document.querySelector('#tiltReset');
const motion=document.querySelector('#tiltMotion');
const sound=document.querySelector('#tiltSound');
const note=document.querySelector('#tiltHint');
const busy=document.querySelector('#message');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let renderer,scene,camera,posterGroup,alive,frame=0,lastTime=0;
let performers=null,performerRoot=null,actIndex=-1,cameraStream=null,sessionId=0;
let targetX=0,targetY=0,targetZ=0,curX=0,curY=0;
let playing=false,dragging=false,dragX=0,dragY=0,baseX=0,baseY=0;
let motionActive=false,motionSeen=false,motionOrigin=null,soundOn=false;
let backgroundStatus='Camera opening…';
const soundtrack=new Audio('../auditions/assets/nadanu-retro-score.m4a');
soundtrack.loop=true;soundtrack.preload='none';soundtrack.volume=.72;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const setHint=t=>{if(note)note.textContent=t;};
function onMotion(event){
 if(!playing)return;
 const gamma=event.gamma,beta=event.beta;
 if(!Number.isFinite(gamma)||!Number.isFinite(beta))return;
 if(!motionOrigin)motionOrigin={gamma,beta};
 motionSeen=true;motionActive=true;
 // Small calibrated rotation so moving the phone gives real perspective,
 // never a twitching poster or sudden full-screen jump.
 targetY=clamp((gamma-motionOrigin.gamma)*.006,-.21,.21);
 targetX=clamp(-(beta-motionOrigin.beta)*.0045,-.16,.16);
 if(motion)motion.textContent='MOTION ON';
}
function listenMotion(){window.removeEventListener('deviceorientation',onMotion,true);window.addEventListener('deviceorientation',onMotion,true);}
async function enableMotion(){
 if(!('DeviceOrientationEvent' in window)){setHint('Motion sensor unavailable. Drag the invitation to explore its 3D depth.');return;}
 try{
  // iOS requires this permission specifically; it is not CAMERA access.
  if(typeof DeviceOrientationEvent.requestPermission==='function'){
   const result=await DeviceOrientationEvent.requestPermission();
   if(result!=='granted'){setHint('Motion not enabled. You can still drag to explore 3D.');return;}
  }
  motionOrigin=null;listenMotion();setHint('Move your phone gently, or drag the invitation with your finger.');
  if(motion)motion.textContent='MOTION READY';
 }catch(e){console.warn('Motion permission unavailable',e);setHint('Use touch drag to explore the invitation in 3D.');}
}
function createPoster(){
 const texture=new THREE.TextureLoader().load('./assets/finale-invitation.webp',
  ()=>{texture.colorSpace=THREE.SRGBColorSpace;},
  undefined,()=>setHint('Original poster could not load. Please refresh on a stable connection.'));
 texture.colorSpace=THREE.SRGBColorSpace;
 const paper=new THREE.Mesh(new THREE.PlaneGeometry(1,2048/1441),
  new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
 paper.position.z=-.045;posterGroup.add(paper);
 const rim=new THREE.Mesh(new THREE.BoxGeometry(1.014,2048/1441+.016,.013),
  new THREE.MeshStandardMaterial({color:0x422116,metalness:.46,roughness:.55}));
 rim.position.z=-.063;posterGroup.add(rim);
 const back=new THREE.Mesh(new THREE.PlaneGeometry(1.065,2048/1441+.065),
  new THREE.MeshBasicMaterial({color:0x170b0c,transparent:true,opacity:.85}));
 back.position.z=-.071;posterGroup.add(back);
 alive=createAliveInvitation(posterGroup);
 alive.root.visible=true;
}
function resize(){
 if(!renderer||!camera)return;
 const w=Math.max(1,viewer.clientWidth),h=Math.max(1,viewer.clientHeight);
 renderer.setSize(w,h,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
 camera.aspect=w/h;
 const fov=camera.fov*Math.PI/180;
 // Fit the entire invitation on any phone orientation, leaving room for controls.
 const paddedHeight=1.64,paddedWidth=1.17;
 camera.position.z=Math.max(paddedHeight/(2*Math.tan(fov/2)),paddedWidth/(2*Math.tan(fov/2)*camera.aspect));
 camera.updateProjectionMatrix();
}
function tick(now){
 if(!playing)return;
 const dt=Math.min(.05,(now-lastTime)/1000||.016);lastTime=now;
 const ease=1-Math.exp(-dt*7);
 curX+=(targetX-curX)*ease;curY+=(targetY-curY)*ease;
 posterGroup.rotation.x=curX;posterGroup.rotation.y=curY;
 posterGroup.position.y=Math.sin(now*.0005)*.006;
 if(performerRoot){performerRoot.rotation.x=curX;performerRoot.rotation.y=curY;}
 if(performers){
  const state=performers.update(dt);
  const showingAct=!state.done;
  posterGroup.visible=!showingAct;
  performerRoot.visible=showingAct;
  if(actTitle && state.index!==actIndex){
   actIndex=state.index;
   actTitle.textContent='ACT 0'+(actIndex+1)+' / 03 · '+state.label;
  }
  if(actTitle)actTitle.hidden=!showingAct;
  if(showingAct&&state.loading)setHint('Preparing '+state.label+'… '+backgroundStatus);
  if(!showingAct&&!window.__nadanuInviteRevealed){
   window.__nadanuInviteRevealed=true;
   setHint('Grand Finale invitation · move your phone or drag for 3D depth.');
  }
 }
 if(alive && posterGroup.visible)alive.update(dt);
 renderer.render(scene,camera);
 frame=requestAnimationFrame(tick);
}
function start(){
 if(playing)return;
 try{
  viewer.hidden=false;viewer.style.display='flex';landing.style.display='none';
  scene=new THREE.Scene();
  scene.background=null;
  scene.add(new THREE.AmbientLight(0xffd0a5,1.45));
  const key=new THREE.DirectionalLight(0xffdfb1,2.25);key.position.set(-1,1,2);scene.add(key);
  const accent=new THREE.PointLight(0xff6b17,2.4,3);accent.position.set(.7,-.35,.6);scene.add(accent);
  camera=new THREE.PerspectiveCamera(38,1,.01,50);
  posterGroup=new THREE.Group();scene.add(posterGroup);
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  createPoster();
  performerRoot=new THREE.Group();scene.add(performerRoot);
  performers=createTiltPerformances(performerRoot,t=>{if(playing&&actTitle)actTitle.textContent=t;});
  posterGroup.visible=false;
  performers.load().catch(e=>console.warn('Stage performer loading:',e));
  window.__nadanuInviteRevealed=false;
  actIndex=-1;resize();
  playing=true;curX=curY=targetX=targetY=0;
  lastTime=performance.now();frame=requestAnimationFrame(tick);
  setHint('Camera and motion opening · 3 original performances will play first.');
  // Android browsers may provide orientation events without explicit permission.
  // iOS gets a dedicated user-gesture permission button.
  if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission!=='function'){
   motionOrigin=null;listenMotion();
  }
  if(motion)motion.hidden=typeof DeviceOrientationEvent==='undefined';
  document.body.classList.add('tilt-open');
  window.addEventListener('resize',resize);
 }catch(e){console.error('3D invitation startup failed:',e);stop();if(busy)busy.textContent='3D preview could not start on this device. Please try Chrome or Safari.';}
}
function stop(){
 playing=false;sessionId++;cancelAnimationFrame(frame);window.removeEventListener('resize',resize);
 window.removeEventListener('deviceorientation',onMotion,true);
 if(alive){alive.dispose();alive=null;}
 if(performers){performers.dispose();performers=null;}
 performerRoot=null;actIndex=-1;
 if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
 if(video){video.pause();video.srcObject=null;video.hidden=true;}
 if(actTitle)actTitle.hidden=true;
 renderer?.dispose();renderer=null;
 scene=null;camera=null;posterGroup=null;
 viewer.hidden=true;viewer.style.display='none';landing.style.display='';
 document.body.classList.remove('tilt-open');
 soundtrack.pause();soundOn=false;if(sound)sound.textContent='SOUND OFF';
 motionOrigin=null;motionActive=false;motionSeen=false;
}
// Both requests START in the SAME genuine user click, not inside a timer or await.
launch?.addEventListener('click',()=>{
 const id=++sessionId;
 let sensorRequest=null;
 if('DeviceOrientationEvent' in window){
  try{
   if(typeof DeviceOrientationEvent.requestPermission==='function'){
    sensorRequest=DeviceOrientationEvent.requestPermission();
   }else{sensorRequest=Promise.resolve('granted');}
  }catch(e){sensorRequest=Promise.reject(e);}
 }
 let cameraRequest=null;
 try{
  if(navigator.mediaDevices?.getUserMedia){
   cameraRequest=navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
  }
 }catch(e){cameraRequest=Promise.reject(e);}
 start();
 if(sensorRequest){
  Promise.resolve(sensorRequest).then(v=>{
   if(id!==sessionId||!playing)return;
   if(v==='granted'){listenMotion();motionOrigin=null;if(motion)motion.textContent='MOTION ON';}
   else setHint('Motion access denied · drag works, camera can still work.');
  }).catch(e=>{console.warn('Motion request:',e);if(id===sessionId&&playing)setHint('Use finger drag for 3D movement.');});
 }
 if(cameraRequest){
  Promise.resolve(cameraRequest).then(stream=>{
   if(id!==sessionId||!playing){stream.getTracks().forEach(t=>t.stop());return;}
   cameraStream=stream;
   video.srcObject=stream;video.hidden=false;
   backgroundStatus='Camera on';
   video.play().catch(e=>console.warn('Background camera playback:',e));
   setHint('Camera on · move your phone or drag to explore.');
  }).catch(e=>{
   backgroundStatus='Camera unavailable';
   console.warn('Camera access unavailable:',e);
   if(id===sessionId&&playing)setHint('Camera unavailable · 3D still works using touch or motion.');
  });
 }else{
  backgroundStatus='Camera not supported';
  if(playing)setHint('Camera not supported · 3D still works.');
 }
});
close?.addEventListener('click',stop);
reset?.addEventListener('click',()=>{targetX=targetY=curX=curY=0;motionOrigin=null;setHint('View reset. Move phone or drag to explore.');});
motion?.addEventListener('click',enableMotion);
sound?.addEventListener('click',()=>{
 if(soundOn){soundtrack.pause();soundOn=false;sound.textContent='SOUND OFF';}
 else {soundOn=true;sound.textContent='SOUND ON';soundtrack.play().catch(()=>{soundOn=false;sound.textContent='SOUND OFF';});}
});
viewer?.addEventListener('pointerdown',e=>{
 if(e.target.closest('button,a'))return;
 dragging=true;dragX=e.clientX;dragY=e.clientY;baseX=targetX;baseY=targetY;
 viewer.setPointerCapture(e.pointerId);
});
viewer?.addEventListener('pointermove',e=>{
 if(!dragging)return;
 targetY=clamp(baseY+(e.clientX-dragX)/Math.max(1,viewer.clientWidth)*.52,-.24,.24);
 targetX=clamp(baseX-(e.clientY-dragY)/Math.max(1,viewer.clientHeight)*.46,-.2,.2);
});
viewer?.addEventListener('pointerup',()=>{dragging=false;});
viewer?.addEventListener('pointercancel',()=>{dragging=false;});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&playing)stop();});
window.__nadanuARReady=true; // Existing landing failure fallback checks this flag.
