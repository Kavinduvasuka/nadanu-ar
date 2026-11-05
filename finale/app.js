import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';

// Nadanu 3.0 Grand Finale — lightweight, real Three.js objects.
// Keeps the same MindAR target and Start/Exit AR behaviour as the working version.
const landing = document.querySelector('#landing');
const startButton = document.querySelector('#startButton');
const stopButton = document.querySelector('#stopButton');
const message = document.querySelector('#message');
const arUI = document.querySelector('#arUI');
const status = document.querySelector('#trackingStatus');
const clock = new THREE.Clock();
let mindarThree, initialized = false, running = false, busy = false;
let targetVisible = false, targetStart = 0;
let effects = [];
let stage, title, invite, lights = [], equalizers = [], particles = [], beamGroup;

function textTexture(lines, {size = 74, color = '#ffe1a2', accent = '#ff9b43'} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 384;
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.shadowColor = accent; c.shadowBlur = 25;
  const gradient = c.createLinearGradient(0, 50, 0, 330);
  gradient.addColorStop(0, '#fff1bd'); gradient.addColorStop(0.52, color);
  gradient.addColorStop(1, accent);
  c.fillStyle = gradient;
  const count = lines.length;
  lines.forEach((line, index) => {
    // Shrink very long lines to prevent clipped letters on mobile.
    let px = size;
    c.font = `900 ${px}px Impact, Arial Black, sans-serif`;
    while (c.measureText(line).width > 930 && px > 28) {
      px -= 2; c.font = `900 ${px}px Impact, Arial Black, sans-serif`;
    }
    const y = count === 1 ? 195 : 145 + index * 125;
    c.fillText(line, 512, y);
  });
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textPlane(lines, width, height, y, z, opts={}) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({map: textTexture(lines, opts), transparent:true, depthWrite:false, side:THREE.DoubleSide})
  );
  mesh.position.set(0,y,z);
  return mesh;
}

function box(w,h,d,color, metalness=0.0) {
  return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
    new THREE.MeshStandardMaterial({color,metalness,roughness:.43}));
}
function circle(radius, color, opacity=1) {
  return new THREE.Mesh(new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({color,transparent:opacity!==1,opacity,side:THREE.DoubleSide,depthWrite:false}));
}
function makeSpeaker(x) {
  const group = new THREE.Group();
  const cabinet = box(.125,.26,.115,0x190f1b);
  group.add(cabinet);
  for (const [y,r] of [[-.058,.045],[.073,.026]]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r,.008,6,28),
      new THREE.MeshBasicMaterial({color:0xfdae4b}));
    rim.position.set(0,y,.064); group.add(rim);
    const cone = circle(r*.77,0x583543);
    cone.position.set(0,y,.066);group.add(cone);
  }
  group.position.set(x,-.075,.215);
  return group;
}
function makeSpotlight(x) {
  const g = new THREE.Group();
  g.position.set(x,.065,.23);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(.035,.047,.07,14),
    new THREE.MeshStandardMaterial({color:0x29212d,metalness:.5,roughness:.38}));
  head.rotation.x = Math.PI/2;
  g.add(head);
  const lens = circle(.033,0xffb453);lens.position.z=.042;g.add(lens);
  // Transparent cone is a real Three.js 3D object; no video asset required.
  const cone = new THREE.Mesh(new THREE.ConeGeometry(.155,.52,24,1,true),
    new THREE.MeshBasicMaterial({color:0xff8426,transparent:true,opacity:.14,
      depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
  cone.rotation.x = -Math.PI/2;
  cone.position.set(0,.17,.28);
  g.add(cone);
  return {group:g,cone};
}
function setup() {
  mindarThree = new MindARThree({
    container:document.querySelector('#arContainer'),
    imageTargetSrc:'./assets/finale.mind',
    maxTrack:1,uiLoading:'yes',uiScanning:'no',uiError:'yes'
  });
  const {renderer,scene,camera} = mindarThree;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const anchor = mindarThree.addAnchor(0);
  const root = anchor.group;

  scene.add(new THREE.AmbientLight(0xffffff,1.5));
  const warm = new THREE.PointLight(0xff8e38,3,4);warm.position.set(0,.4,.9);root.add(warm);
  const violet = new THREE.PointLight(0xa34dff,2,3);violet.position.set(-.3,0,.7);root.add(violet);

  // Mini stage rises above the printed invitation (z dimension).
  stage = new THREE.Group();stage.position.set(0,-.10,.085);
  const platform=box(.77,.065,.31,0x40151e,.15);
  platform.position.z=.11;stage.add(platform);
  const stageTrim=box(.78,.014,.32,0xffa444,.1);
  stageTrim.position.set(0,-.034,.11);stage.add(stageTrim);
  const backWall=box(.77,.36,.045,0x261323,.08);
  backWall.position.set(0,.19,.0);stage.add(backWall);
  const topTruss=box(.86,.025,.035,0xd08a48,.55);
  topTruss.position.set(0,.39,.055);stage.add(topTruss);
  // Three dimensional stage side uprights.
  for (const x of [-.40,.40]) {
    const upright=box(.022,.38,.025,0xc27c42,.4);
    upright.position.set(x,.20,.05);stage.add(upright);
    stage.add(makeSpeaker(x * .79));
  }
  // Colored LED bars on the back wall.
  for (let i=0;i<11;i++) {
    const led=box(.026,.06,.007,i%2 ? 0xff8739 : 0xa357ff);
    led.material=new THREE.MeshBasicMaterial({color:i%2 ? 0xff8739 : 0xbb6eff});
    led.position.set(-.30+i*.06,.18,.028);
    stage.add(led);equalizers.push(led);
  }
  beamGroup=new THREE.Group();stage.add(beamGroup);
  for(let i=0;i<4;i++){
    const item=makeSpotlight(-.29+i*.19);
    item.group.position.y=.35;
    stage.add(item.group);lights.push(item);
  }
  root.add(stage);

  title = textPlane(['NADANU 3.0','GRAND FINALE'],.98,.32,.48,.20,{size:94});
  root.add(title);
  invite = textPlane(['YOU ARE CORDIALLY INVITED','WITNESS THE FINAL SHOWDOWN'],1.06,.29,-.51,.16,{size:60,color:'#fff4ce',accent:'#f1a544'});
  root.add(invite);

  // Floating celebratory golden particles.
  for(let i=0;i<26;i++) {
    const p = new THREE.Mesh(new THREE.OctahedronGeometry(.004+Math.random()*.007),
      new THREE.MeshBasicMaterial({color:i%4===0?0xd38dff:0xffba4d}));
    const theta=Math.random()*Math.PI*2;
    const r=.22+Math.random()*.37;
    p.position.set(Math.cos(theta)*r,Math.sin(theta)*r*.96,.18+Math.random()*.15);
    p.userData={y:p.position.y,phase:Math.random()*6.28,speed:.9+Math.random()*.8};
    root.add(p);particles.push(p);
  }
  root.visible=false;
  anchor.onTargetFound=()=>{
    targetVisible=true;targetStart=clock.getElapsedTime();root.visible=true;
    status.textContent='Invitation detected — enjoy the Grand Finale preview!';
  };
  anchor.onTargetLost=()=>{
    targetVisible=false;root.visible=false;
    status.textContent='Point your camera at the Grand Finale invitation';
  };
  renderer.setAnimationLoop(()=>{
    const t=clock.getElapsedTime();
    if (running && targetVisible) {
      const reveal=Math.min(1,(t-targetStart)/1.4);
      // Stage rises over the first second, then the title and invitation appear.
      stage.scale.setScalar(.35+.65*THREE.MathUtils.smoothstep(reveal,0,1));
      stage.rotation.y=Math.sin(t*.55)*.055;
      title.material.opacity=Math.min(1,Math.max(0,(t-targetStart-0.5)*1.7));
      title.position.y=.48+Math.sin(t*1.7)*.014;
      invite.material.opacity=Math.min(1,Math.max(0,(t-targetStart-1.5)*1.4));
      invite.scale.setScalar(1+Math.sin(t*2)*.016);
      lights.forEach((item,i)=>{
        item.cone.rotation.z=Math.sin(t*1.9+i*1.4)*.38;
        item.cone.material.opacity=.10+.09*(.5+.5*Math.sin(t*3+i));
      });
      equalizers.forEach((led,i)=>{
        led.scale.y=.55+.85*(.5+.5*Math.sin(t*5+i*.9));
      });
      particles.forEach(p=>{
        p.position.y=p.userData.y+Math.sin(t*p.userData.speed+p.userData.phase)*.026;
        p.rotation.y=t*.7;
      });
    }
    renderer.render(scene,camera);
  });
  initialized=true;
}
async function startAR(){
  if (busy||running) return;
  busy=true;startButton.disabled=true;message.textContent='Preparing camera…';
  try {
    const response=await fetch('./assets/finale.mind',{cache:'no-cache'});
    if(!response.ok) throw new Error('Missing assets/finale.mind. Add your compiled invitation target.');
    if(!initialized)setup();
    await mindarThree.start();
    running=true;clock.start();
    landing.style.display='none';arUI.hidden=false;
    status.textContent='Point your camera at the Grand Finale invitation';
  } catch(err) {
    console.error(err);message.textContent=err.message||'AR could not start. Check camera permission and HTTPS.';
    if(mindarThree){try{await mindarThree.stop();}catch(_){}}
  } finally {busy=false;startButton.disabled=false;}
}
async function stopAR(){
  if(busy||!running)return;
  busy=true;
  try {
    await mindarThree.stop();running=false;targetVisible=false;
    arUI.hidden=true;landing.style.display='grid';message.textContent='';
  } catch(err){console.error(err);status.textContent='Unable to stop camera. Refresh the page.';}
  finally {busy=false;}
}
startButton.addEventListener('click',startAR);
stopButton.addEventListener('click',stopAR);
window.addEventListener('pagehide',()=>{if(running&&mindarThree)mindarThree.stop().catch(()=>{});});
