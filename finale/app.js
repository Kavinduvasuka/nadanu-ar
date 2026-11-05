import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';

const landing = document.querySelector('#landing');
const startButton = document.querySelector('#startButton');
const stopButton = document.querySelector('#stopButton');
const message = document.querySelector('#message');
const arUI = document.querySelector('#arUI');
const status = document.querySelector('#trackingStatus');
let mindarThree = null;
let initialized = false;
let running = false;
let busy = false;
let particles = [];
let headline = null;
let clock = new THREE.Clock();

// Generate text on a transparent texture, so no separate video is needed.
function makeTextTexture(line1, line2) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,'#ffedaa'); gradient.addColorStop(.5,'#f7a741'); gradient.addColorStop(1,'#b33b20');
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff641f';ctx.shadowBlur = 32;
  ctx.fillStyle=gradient; ctx.font='900 94px Impact, Arial Black, sans-serif';
  ctx.fillText(line1,512,220);
  ctx.font='900 115px Impact, Arial Black, sans-serif';
  ctx.fillText(line2,512,355);
  ctx.shadowBlur=0;ctx.strokeStyle='#fff0ae';ctx.lineWidth=6;
  ctx.beginPath();ctx.moveTo(250,410);ctx.lineTo(774,410);ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function setup() {
  mindarThree = new MindARThree({
    container: document.querySelector('#arContainer'),
    imageTargetSrc: './assets/finale.mind',
    maxTrack: 1,
    uiLoading: 'yes',
    uiScanning: 'no',
    uiError: 'yes'
  });
  const {renderer, scene, camera} = mindarThree;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const anchor = mindarThree.addAnchor(0);

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.02,0.53),
    new THREE.MeshBasicMaterial({map:makeTextTexture('NADANU 3.0','GRAND FINALE'),transparent:true,side:THREE.DoubleSide,depthWrite:false})
  );
  panel.position.set(0,0,0.035);
  anchor.group.add(panel);
  headline = panel;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(.54,.56,96),
    new THREE.MeshBasicMaterial({color:0xff9b3c,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false})
  );
  ring.scale.set(1,1.35,1);ring.position.z=.025;anchor.group.add(ring);

  for(let i=0;i<35;i++){
    const dot=new THREE.Mesh(
      new THREE.SphereGeometry(.005+Math.random()*.007,6,6),
      new THREE.MeshBasicMaterial({color:i%3===0?0xffed96:0xff772b,transparent:true,opacity:.85})
    );
    const angle=Math.random()*Math.PI*2;
    const radius=.25+Math.random()*.55;
    dot.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius*1.2,.045);
    dot.userData={seed:Math.random()*6.28,speed:.5+Math.random()*1.5,baseY:dot.position.y};
    anchor.group.add(dot);particles.push(dot);
  }

  anchor.onTargetFound=()=>{status.textContent='Grand Finale invitation detected!';};
  anchor.onTargetLost=()=>{status.textContent='Point camera at the Grand Finale invitation';};
  renderer.setAnimationLoop(()=>{
    const t=clock.getElapsedTime();
    if(headline) headline.scale.setScalar(1+Math.sin(t*2)*.018);
    ring.material.opacity=.50+.28*Math.sin(t*2.1);
    for(const p of particles){p.position.y=p.userData.baseY+Math.sin(t*p.userData.speed+p.userData.seed)*.035;}
    renderer.render(scene,camera);
  });
  initialized=true;
}

async function startAR(){
  if(busy||running)return;
  busy=true;startButton.disabled=true;message.textContent='Preparing camera…';
  try{
    // A missing .mind file should be explained before camera startup.
    const response=await fetch('./assets/finale.mind',{method:'GET'});
    if(!response.ok)throw new Error('Missing assets/finale.mind. Compile your invitation image first.');
    if(!initialized)setup();
    await mindarThree.start();
    running=true;clock.start();
    landing.style.display='none';arUI.hidden=false;
    status.textContent='Point camera at the Grand Finale invitation';
  }catch(err){
    console.error(err);
    message.textContent=err.message||'AR could not start. Check camera permission and HTTPS.';
    if(mindarThree){try{await mindarThree.stop();}catch(_){}}
  }finally{busy=false;startButton.disabled=false;}
}
async function stopAR(){
  if(busy||!running)return;
  busy=true;
  try{await mindarThree.stop();running=false;arUI.hidden=true;landing.style.display='grid';message.textContent='';}
  catch(err){console.error(err);status.textContent='Unable to stop camera. Please refresh.';}
  finally{busy=false;}
}
startButton.addEventListener('click',startAR);
stopButton.addEventListener('click',stopAR);
window.addEventListener('pagehide',()=>{if(running&&mindarThree)mindarThree.stop().catch(()=>{});});
