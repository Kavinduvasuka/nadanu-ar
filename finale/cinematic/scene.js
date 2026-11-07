import * as THREE from './three.module.js';
const poster=document.getElementById('poster'), viewport=document.getElementById('viewport');
const stats=document.getElementById('status'), progress=document.getElementById('introProgress');
const W=10,H=14.21235,PW=1441,PH=2048;
const xy=(x,y,z=0)=>new THREE.Vector3((x/PW-.5)*W,(.5-y/PH)*H,z);
const texLoader=new THREE.TextureLoader();
const files={
 seal:['logo_icbt_seal',90,51,101,110,-.01],icbt:['logo_icbt_campus_text',192,58,133,100,-.01],rank:['logo_number_one_private_university',333,64,271,86,-.01],
 csicon:['logo_computing_society_icon',913,56,74,81,-.01],cstext:['logo_computing_society_text',1011,63,350,75,-.01],
 society:['text_computing_society_of_icbt',481,192,465,45,-.01],presents:['text_presents',640,263,169,26,-.01],
 logo:['logo_nadanu_star',504,309,438,385,.42],tagline:['text_feel_the_beat_own_the_stage',567,682,338,52,.27],version:['text_3_0',653,731,138,78,.34],
 splash:['graphic_orange_splash_behind_title',166,754,1120,265,.02],title:['text_grand_finale',210,790,1025,225,.48],
 brush:['graphic_invitation_yellow_brush',392,982,647,148,.08],invitation:['text_invitation_black',426,1003,575,108,.4],
 message:['text_invitation_line',349,1140,742,137,.23],gold1:['line_gold_divider_1',503,1282,427,29,.19],
 date:['text_date_26_november',107,1349,285,215,.24],time:['text_time_130pm_onwards',441,1366,396,194,.24],venue:['text_venue_icbt_colombo_campus',884,1356,467,211,.24],
 honoured:['text_honoured_by_your_presence',350,1578,745,44,.23],showdown:['text_join_us_final_showdown',218,1696,1042,184,.32],gold2:['line_gold_divider_2',420,1860,557,79,.21],
 crowd:['graphic_crowd_silhouette',28,1860,1390,177,.07],
 leftEQ:['graphic_equalizer_left_FULL',22,840,117,264,.12],rightEQ:['graphic_equalizer_right_top_FULL',1292,554,130,293,.12],bottomEQ:['graphic_equalizer_bottom_right_FULL',1280,1824,130,173,.13],
 note1:['icon_music_note_left',45,812,66,100,.24],note2:['icon_music_note_top_right',1335,522,56,110,.24],note3:['icon_music_note_bottom_right',1361,1324,59,104,.24],
 bulb1:['object_bulb_left',28,158,58,76,.47],bulb2:['object_bulb_top',1034,27,63,79,.47],bulb3:['object_bulb_right',1193,132,62,78,.47],
 cassette:['object_cassette_FULL_tilted',-87,1667,430,335,.58],disc:['object_vinyl_record_FULL',1232,116,447,447,.50],mic:['object_microphone_FULL',1252,1439,242,555,.6]
};
let renderer,scene,camera,root,bgMesh,FX,frameRequested=0;
const all={},animated=[],bulbs=[],reels=[],particles=[],equalizerBars=[],rings=[],shimmerCards=[],tubeLights=[],cassetteSpools=[];
let elapsed=0,playing=true,comparison=false,speed=1,targetRX=0,targetRY=0,pointerDown=false,dragX=0,dragY=0,autoOrbit=true,previous=0;
const gs={};
function material(color=0xffffff,props={}){return new THREE.MeshStandardMaterial({color,metalness:.52,roughness:.38,...props})}
function setStatus(s){stats.textContent=s}
function texture(file){return new Promise((resolve,reject)=>texLoader.load('assets/'+file+'.png',t=>{t.encoding=THREE.sRGBEncoding;t.anisotropy=2;resolve(t)},undefined,reject))}
function quad(tex,w,h,m){return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide,...m}));}
function groupFor(key,tex){const [file,x,y,width,height,z]=files[key];const w=width/PW*W,h=height/PH*H;
 const g=new THREE.Group();g.position.copy(xy(x+width/2,y+height/2,z));g.userData={key,w,h,z,origin:g.position.clone()};root.add(g);all[key]=g;
 return {g,w,h,tex};}
function frontElement(key,tex,depth=false){const {g,w,h}=groupFor(key,tex);if(depth){let layers=key==='title'?9:key==='logo'?9:5;for(let i=layers;i>=1;i--){const d=quad(tex,w,h,{color:key==='title'?0x6b1d0b:0x3e1530,opacity:.60});d.position.set(-i*.008,i*.005,-i*.038);g.add(d)}}const p=quad(tex,w,h,{});p.position.z=.038;g.add(p);g.userData.face=p;return g;}
function flat(key,tex){return frontElement(key,tex,false)}
function makeDisc(tex){const {g,w,h}=groupFor('disc',tex);const r=Math.min(w,h)*.49;g.position.z=.41;g.userData.origin.copy(g.position);
 const outer=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.19,96,2),material(0x140d0d,{metalness:.91,roughness:.2}));outer.rotation.x=Math.PI/2;g.add(outer);
 const side=new THREE.Mesh(new THREE.TorusGeometry(r*.985,.057,10,96),material(0x8a571d,{metalness:.82,roughness:.28}));side.position.z=.12;g.add(side);
 for(let k=0;k<17;k++){const ring=new THREE.Mesh(new THREE.TorusGeometry(r*(.34+k*.035),.0065,4,112),new THREE.MeshStandardMaterial({color:k%3===0?0x935d28:0x453321,metalness:.96,roughness:.20,emissive:0x6b2c0c,emissiveIntensity:.035}));ring.position.z=.115;g.add(ring)}
 const face=quad(tex,w,h);face.position.z=.15;g.add(face);
 const spindle=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.27,20),material(0xcaa35d,{metalness:.9}));spindle.rotation.x=Math.PI/2;g.add(spindle);
 const shine=new THREE.Mesh(new THREE.PlaneGeometry(r*1.7,r*.08),new THREE.MeshBasicMaterial({color:0xffa753,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false}));shine.position.z=.17;g.add(shine);
 gs.disc={g,shine};return g;
}
function makeCassette(tex){const {g,w,h}=groupFor('cassette',tex);// Keep the cassette above the crowd but behind the golden 'Join Us' lettering.
 g.position.z=.08;g.userData.origin.copy(g.position);
 const body=new THREE.Mesh(new THREE.BoxGeometry(w*.90,h*.74,.20),[material(0x362017),material(0x21110c),material(0x5c3b22),material(0x1e110e),material(0x352019),material(0x281710)]);body.rotation.z=.04;g.add(body);
 // The authentic artwork remains stationary relative to the mechanism.
 const face=quad(tex,w,h);face.position.z=.14;g.add(face);
 // Determine reels from the TWO ACTUAL BLACK WINDOWS of the supplied tilted artwork:
 // left window approx (228,323), right approx (505,241) of 745x579 PNG.
 const positions=[[228/745,323/579],[505/745,241/579]];
 const caps=[];const reelRadius=w*.069;
 positions.forEach(([u,v],i)=>{
  const reel=new THREE.Group();reel.position.set((u-.5)*w,(.5-v)*h,.196);g.add(reel);
  // Open centre with bright mechanical ivory spokes, constrained to the visible window.
  const hubBase=new THREE.Mesh(new THREE.CircleGeometry(reelRadius*.96,60),new THREE.MeshBasicMaterial({color:0x090706,transparent:true,opacity:.97,depthWrite:false}));reel.add(hubBase);
  const outer=new THREE.Mesh(new THREE.TorusGeometry(reelRadius*.88,reelRadius*.067,7,64),new THREE.MeshBasicMaterial({color:0xe7ca90}));outer.position.z=.01;reel.add(outer);
  const centre=new THREE.Mesh(new THREE.CircleGeometry(reelRadius*.23,24),new THREE.MeshBasicMaterial({color:0xffebc7}));centre.position.z=.035;reel.add(centre);
  for(let j=0;j<5;j++){
   const a=j*2*Math.PI/5;
   const spoke=new THREE.Mesh(new THREE.BoxGeometry(reelRadius*.69,reelRadius*.16,.014),new THREE.MeshBasicMaterial({color:0xffe6b5}));
   spoke.position.set(Math.cos(a)*reelRadius*.48,Math.sin(a)*reelRadius*.48,.028);spoke.rotation.z=a;reel.add(spoke);
  }
  reels.push(reel);caps.push(reel);
 });
 // Drive belt moves between the actual windows, rather than floating over the tape print.
 const belt=new THREE.Mesh(new THREE.PlaneGeometry(w*.28,h*.018),new THREE.MeshBasicMaterial({color:0x29150f,transparent:true,opacity:.78,depthWrite:false}));
 belt.position.set(-w*.005,h*.002,.15);belt.rotation.z=-.28;g.add(belt);
 const heads=[];for(let n=0;n<3;n++){const tooth=new THREE.Mesh(new THREE.BoxGeometry(w*.033,h*.020,.025),material(0xe6b67a,{metalness:.9,roughness:.23}));tooth.position.set((n-1)*w*.065,-h*.20,.15);g.add(tooth);heads.push(tooth)}
 gs.tape={tape:belt,heads};gs.cassette=g;gs.cassetteReels=caps;return g;
}
function makeMic(tex){const {g,w,h}=groupFor('mic',tex);g.position.z=.54;g.userData.origin.copy(g.position);
 const gold=material(0xe4af6b,{metalness:.96,roughness:.2});const dark=material(0x2b1712,{metalness:.79,roughness:.33});
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.11,.17,h*.52,24),dark);stem.position.set(0,-h*.20,-.13);stem.rotation.z=-.21;g.add(stem);
 const head=new THREE.Mesh(new THREE.SphereGeometry(w*.40,32,24),gold);head.scale.set(.8,1.15,.81);head.position.set(0,h*.20,-.12);g.add(head);
 for(let j=0;j<9;j++){const ring=new THREE.Mesh(new THREE.TorusGeometry(w*.32*(1-j*.018),.018,7,50),dark);ring.rotation.x=.34;ring.position.set(0,h*(.05+j*.044),.08);g.add(ring)}
 const face=quad(tex,w,h);face.position.z=.25;g.add(face);gs.mic=g;
 const sweep=new THREE.Mesh(new THREE.PlaneGeometry(w*.12,h*.88),new THREE.MeshBasicMaterial({color:0xffe3b1,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
 sweep.position.set(-w*.32,0,.28);sweep.rotation.z=-.16;g.add(sweep);gs.micSweep={mesh:sweep,w};
 const shine=new THREE.SpotLight(0xffc67f,1.8,7,Math.PI/6,.7,2);shine.position.set(1,1,3);shine.target.position.set(0,0,0);g.add(shine,shine.target);gs.micLight=shine;
 return g;}
// Radial alpha maps prevent the square billboard glow seen in the first master.
function radialGlow(inner='#fff8c7',mid='#ffbb4d'){
 const c=document.createElement('canvas');c.width=c.height=128;
 const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,63);
 g.addColorStop(0,inner);g.addColorStop(.12,mid+'cc');g.addColorStop(.38,mid+'42');
 g.addColorStop(.76,mid+'09');g.addColorStop(1,'rgba(255,170,40,0)');
 x.fillStyle=g;x.fillRect(0,0,128,128);
 const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;
}
const GLOW_TEX=radialGlow();
function glowSprite(w,h,z,alpha=.5){
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color:0xffb955,transparent:true,opacity:alpha,depthWrite:false,blending:THREE.AdditiveBlending}));
 sprite.scale.set(w,h,1);sprite.position.z=z;return sprite;
}
function line3D(points,color=0xffca74,rad=.014){
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 return new THREE.Mesh(new THREE.TubeGeometry(path,24,rad,6,false),new THREE.MeshBasicMaterial({color,toneMapped:false}));
}
function makeBulb(key,tex,i){const {g,w,h}=groupFor(key,tex);
 g.position.z=.67;g.userData.origin.copy(g.position);
 // The supplied original PNG has opaque brown rectangular pixels around the glass.
 // Load carefully clipped OFF/ON bulb textures; never use the original rectangular card.
 const suffix=key==='bulb1'?'left':key==='bulb2'?'top':'right';
 const offMap=texLoader.load('assets/bulb_shape_'+suffix+'_off.png');
 const litMap=texLoader.load('assets/bulb_shape_'+suffix+'_on.png');
 for(const t of [offMap,litMap])t.encoding=THREE.sRGBEncoding;
 const art=quad(offMap,w,h,{opacity:.58});art.position.z=.20;g.add(art);
 const lit=quad(litMap,w,h,{opacity:0,blending:THREE.NormalBlending});lit.position.z=.215;g.add(lit);
 // Real volumetric bulb silhouette, glowing filament, and circular falloff.
 const glass=new THREE.Mesh(new THREE.SphereGeometry(w*.28,24,18),new THREE.MeshPhysicalMaterial({color:0xffcf78,transparent:true,opacity:.08,roughness:.15,metalness:0,depthWrite:false,emissive:0xff9e31,emissiveIntensity:.04}));glass.scale.y=1.35;glass.position.set(0,-h*.12,.05);g.add(glass);
 const filament=line3D([[-w*.115,-h*.14,.25],[-w*.065,-h*.29,.26],[0,-h*.13,.27],[w*.065,-h*.29,.26],[w*.115,-h*.14,.25]],0xfff0c7,.007);g.add(filament);
 const filamentLight=new THREE.PointLight(0xffaf52,0,3.4,2);filamentLight.position.set(0,-h*.15,.45);g.add(filamentLight);
 const corona=glowSprite(w*1.8,h*1.65,.11,0);corona.position.y=-h*.13;g.add(corona);
 const bloom=glowSprite(w*3.0,h*2.9,.08,0);bloom.position.y=-h*.13;g.add(bloom);
 // No visible rectangular flare planes: corona and bloom are radial-alpha sprites.
 bulbs.push({g,art,lit,glass,filament,light:filamentLight,corona,bloom,i});return g;
}
function makeEmblem(tex){const g=frontElement('logo',tex,true);g.position.z=.59;g.userData.origin.copy(g.position);
 const geo=new THREE.TorusGeometry(1.45,.027,8,96);const ring=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xe89528,transparent:true,opacity:.36,blending:THREE.AdditiveBlending}));ring.position.z=-.2;g.add(ring);gs.logoRing=ring;gs.logo=g;return g;}
function makeTitle(tex){const g=frontElement('title',tex,true);gs.title=g;
 const halo=glowSprite(g.userData.w*1.5,g.userData.h*1.9,-.28,.10);g.add(halo);gs.titleHalo=halo;return g;}
function eqBars(){const cols=[{x:65,y:986,s:1},{x:1350,y:660,s:-1},{x:1328,y:1856,s:-1}];cols.forEach(({x,y,s},j)=>{for(let i=0;i<9;i++){let bar=new THREE.Mesh(new THREE.BoxGeometry(.053,.15,.045),new THREE.MeshBasicMaterial({color:0xff752b,transparent:true,opacity:.7}));bar.position.copy(xy(x+s*i*9,y,.26));root.add(bar);equalizerBars.push({bar,j,i,base:bar.position.y});}})}
function extraParticles(){const geometry=new THREE.BufferGeometry(),coords=new Float32Array(135*3),color=[];for(let i=0;i<135;i++){coords[i*3]=(Math.random()-.5)*W;coords[i*3+1]=(Math.random()-.5)*H;coords[i*3+2]=.1+Math.random()*1.4;particles.push({speed:.13+Math.random()*.41,offset:Math.random()*Math.PI*2});color.push(1,.35+Math.random()*.5,.08)}geometry.setAttribute('position',new THREE.BufferAttribute(coords,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(color,3));const mat=new THREE.PointsMaterial({size:.036,vertexColors:true,transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending});FX=new THREE.Points(geometry,mat);root.add(FX)}
async function main(){
 renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#scene'),alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.23;
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-W/2,W/2,H/2,-H/2,.1,100);camera.position.set(0,0,25);camera.lookAt(0,0,0);root=new THREE.Group();scene.add(root);
 scene.add(new THREE.AmbientLight(0xffd4b5,1.38));const warm=new THREE.PointLight(0xff7f36,1.9,16);warm.position.set(-3,2,8);scene.add(warm);const violet=new THREE.PointLight(0xb852ff,.8,12);violet.position.set(3,4,4);scene.add(violet);
 const bg=await new Promise((res,rej)=>texLoader.load('assets/backdrop.webp',res,undefined,rej));bg.encoding=THREE.sRGBEncoding;
 bgMesh=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:bg}));bgMesh.position.z=-2.5;root.add(bgMesh);
 const keys=Object.keys(files);let count=0;
 await Promise.all(keys.map(async key=>{try{const tex=await texture(files[key][0]);const add=key==='disc'?makeDisc:key==='cassette'?makeCassette:key==='mic'?makeMic:key==='logo'?makeEmblem:key==='title'?makeTitle:key.startsWith('bulb')?(t)=>makeBulb(key,t,+key.slice(-1)):t=>flat(key,t);add(tex);count++;setStatus('RECONSTRUCTING ARTWORK · '+count+' / '+keys.length)}catch(e){console.error(key,e)}}));
 eqBars();extraParticles();
 // Moving amber lighting around the poster frame (actual 3D light sources).
 const sideA=new THREE.PointLight(0xff7a25,1.1,10);sideA.position.set(-W*.48,2.2,1.1);root.add(sideA);
 const sideB=new THREE.PointLight(0xffc064,1.0,9);sideB.position.set(W*.48,-2.7,1.3);root.add(sideB);
 gs.frameLights=[sideA,sideB];
 const cv=document.querySelector('#scene');
 function resize(){const b=viewport.getBoundingClientRect();renderer.setSize(b.width,b.height,false)}new ResizeObserver(resize).observe(viewport);resize();
 cv.addEventListener('pointerdown',e=>{pointerDown=true;dragX=e.clientX;dragY=e.clientY;cv.setPointerCapture(e.pointerId)});
 cv.addEventListener('pointermove',e=>{if(!pointerDown||comparison)return;targetRY=THREE.MathUtils.clamp(targetRY+(e.clientX-dragX)*.0015,-.24,.24);targetRX=THREE.MathUtils.clamp(targetRX+(e.clientY-dragY)*.001,-.14,.14);dragX=e.clientX;dragY=e.clientY});cv.addEventListener('pointerup',()=>pointerDown=false);cv.addEventListener('pointercancel',()=>pointerDown=false);
 // The original artwork is front-facing at zero rotation; tilt applies only to this root.
 root.rotation.set(0,0,0);targetRX=targetRY=0;
 const buttons={pause:document.getElementById('pause'),compare:document.getElementById('compare'),reset:document.getElementById('reset'),speed:document.getElementById('speed')};
 buttons.pause.addEventListener('click',()=>{playing=!playing;document.body.classList.toggle('paused',!playing);buttons.pause.textContent=playing?'Ⅱ PAUSE':'▶ PLAY'});
 buttons.compare.addEventListener('click',()=>{comparison=!comparison;document.body.classList.toggle('compare-on',comparison);buttons.compare.textContent=comparison?'✦ VIEW 3D':'◧ VIEW ORIGINAL'});
 buttons.reset.addEventListener('click',()=>{targetRX=0;targetRY=0;root.rotation.set(0,0,0);elapsed=0;playing=true;document.body.classList.remove('paused');buttons.pause.textContent='Ⅱ PAUSE'});
 buttons.speed.addEventListener('click',()=>{speed=speed===1?1.5:speed===1.5?.65:1;buttons.speed.textContent='SPEED '+speed+'×'});
 setStatus('READY · DRAG TO EXPLORE DEPTH');document.body.classList.add('ready');
 requestAnimationFrame(loop);
 }
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.043,(now-previous||16)/1000);previous=now;if(playing&&!comparison)elapsed+=dt*speed;
 const t=elapsed,phase=Math.min(1,t/4.8);
 // Three-dimensional floating print; motion is restrained and positions remain aligned.
 root.rotation.x+=(targetRX-root.rotation.x)*.055;root.rotation.y+=(targetRY-root.rotation.y)*.055;
 root.position.y=(Math.sin(t*.4)*.014);
 if(gs.disc){gs.disc.g.rotation.z=-t*1.26;gs.disc.shine.rotation.z=t*2.7;gs.disc.shine.material.opacity=.1+.13*Math.sin(t*3.5)**2}
 reels.forEach((r,i)=>r.rotation.z=t*(i%2?-5.9:6.4));
 cassetteSpools.forEach((x,i)=>{x.reelLight.material.opacity=.10+.06*Math.sin(t*9+i*2)**2;});
 if(gs.cassette){
  // Smooth, nearly stationary casing, like a real deck with a running motor.
  // Original animation shook the whole cassette excessively.
  const flutter=Math.sin(t*22)*.0014+Math.sin(t*35)*.0005;
  gs.cassette.rotation.z=.003*Math.sin(t*.9)+flutter;
  gs.cassette.rotation.x=.004*Math.sin(t*.6);
  gs.cassette.position.x=gs.cassette.userData.origin.x+flutter*.35;
  gs.cassette.position.y=gs.cassette.userData.origin.y+Math.sin(t*22)*.0014;
  gs.cassette.position.z=.08+.006*Math.sin(t*1.2);
  if(gs.tape){gs.tape.tape.material.opacity=.65+.15*Math.sin(t*12)**2;
    gs.tape.heads.forEach((h,i)=>h.position.y=-gs.cassette.userData.h*.20+Math.sin(t*16+i)*.0018)}
 }
 if(gs.mic){
 gs.mic.rotation.y=Math.sin(t*.72)*.095;
 gs.mic.rotation.z=Math.sin(t*.9)*.008;
 gs.mic.position.z=.54+.025*Math.sin(t*1.4);
 gs.micLight.intensity=2.4+Math.sin(t*2.1)*.85;
 if(gs.micSweep){const u=(t*.18)%1;gs.micSweep.mesh.position.x=(-.53+u)*gs.micSweep.w;gs.micSweep.mesh.material.opacity=.055+.11*Math.sin(u*Math.PI)**3;}
 }
 if(gs.logo){gs.logo.position.z=.59+Math.sin(t*.65)*.15;gs.logo.scale.setScalar(1+Math.sin(t*.9)*.01)}
 if(gs.logoRing){gs.logoRing.rotation.z=t*.11;gs.logoRing.material.opacity=.2+Math.sin(t*1.6)*.13}
 if(gs.title){gs.title.position.z=.48+Math.sin(t*.45)*.12;gs.title.rotation.x=Math.sin(t*.4)*.011;
 gs.titleHalo.material.opacity=.065+.12*Math.sin(t*1.1)**2;}
 for(const b of bulbs){
  // Clear ON/OFF ignition: off for 0.5s, then hard bright flash and steady glow.
  // Stagger lamps; repeat a short animated light sequence every 7.2 seconds.
  const cycle=(t-b.i*.65+7.2*100)%7.2;
  const isLit=cycle>0.50 && cycle<5.85;
  const ignition=Math.min(1,Math.max(0,(cycle-.50)/.12));
  const fadeOut=Math.min(1,Math.max(0,(6.05-cycle)/.20));
  const flicker=.88+.11*Math.sin(t*19+b.i*6.1)**2;
  const power=isLit?Math.min(1,ignition)*flicker*fadeOut:0;
  b.art.material.opacity=.44+.25*power;
  b.lit.material.opacity=power*.98;
  b.glass.material.opacity=.04+.20*power;
  b.glass.material.emissiveIntensity=.06+2.3*power;
  b.filament.material.color.setRGB(1,.42+.58*power,.10+.85*power);
  b.light.intensity=power*9;
  b.corona.material.opacity=power*.94;
  b.bloom.material.opacity=power*.64;
  b.g.rotation.z=Math.sin(t*.9+b.i)*.008;
 }
 for(const {bar,i,j,base} of equalizerBars){const h=.14+(.5+.5*Math.sin(t*5+i*.75+j*1.4))*.37;bar.scale.y=h/.15;bar.position.y=base+(h-.15)/2;}
 if(FX){const p=FX.geometry.attributes.position;for(let i=0;i<particles.length;i++){let y=p.array[i*3+1]+particles[i].speed*dt;if(y>H/2)y=-H/2;p.array[i*3+1]=y;p.array[i*3]+=Math.sin(t*.5+particles[i].offset)*dt*.028}p.needsUpdate=true;FX.material.opacity=.62+.23*Math.sin(t*.65)}
 // Sparkling original text elements with actual layered depth.
 for(let key of ['invitation','showdown','message','tagline','date','time','venue','honoured']){const g=all[key];if(g){const z=g.userData.origin.z;g.position.z=z+Math.sin(t*.7+key.length)*.033;}}
 if(all.brush){all.brush.scale.x=1+Math.sin(t*.5)*.008}
 if(gs.frameLights){gs.frameLights[0].intensity=1.25+1.05*Math.sin(t*.77)**2;gs.frameLights[1].intensity=.90+.95*Math.cos(t*.93)**2;}
 for(let key of ['gold1','gold2','showdown','invitation','tagline','honoured']){
  let g=all[key];if(g?.userData.face){let p=g.userData.face;
   p.material.opacity=.83+.17*Math.sin(t*1.35+key.length*.6)**2;
  }
 }
 progress.style.width=(Math.min(1,t/7.5)*100)+'%';
 renderer.render(scene,camera);
 if(!window.__nadanuFirstFrame){
  window.__nadanuFirstFrame=true;
  window.parent?.postMessage({type:'nadanu-scene-ready'},location.origin);
 }
}
main().catch(e=>{console.error(e);document.body.classList.add('fallback-original');setStatus('3D PREVIEW UNAVAILABLE · ORIGINAL ARTWORK SHOWN');window.parent?.postMessage({type:'nadanu-scene-ready'},location.origin);});

// Embedded-final-invitation mode: parent requested motion on the initial AR click.
// Use the parent origin check to reject unrelated frame messages.
window.addEventListener('message', event => {
 if(event.origin !== location.origin || !event.data) return;
 if(event.data.type === 'nadanu-reset-view') { targetRX=0;targetRY=0;root?.rotation.set(0,0,0);return; }
 if(event.data.type !== 'nadanu-motion') return;
 if(pointerDown || comparison) return;
 const x=Number(event.data.x),y=Number(event.data.y);
 if(!Number.isFinite(x)||!Number.isFinite(y))return;
 targetRX=THREE.MathUtils.clamp(x,-.23,.23);
 targetRY=THREE.MathUtils.clamp(y,-.30,.30);
});
