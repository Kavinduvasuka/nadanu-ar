import * as THREE from 'three';

// Camera-tracked finale artwork. Coordinates follow the original 1441 × 2048
// printed invitation; no gyroscope or screen-space fake parallax is used.
export function createAliveInvitation(anchorRoot){
 const root=new THREE.Group();anchorRoot.add(root);root.visible=false;
 const W=1,H=2048/1441;
 const pos=(x,y,z=.06)=>[(x/1441-.5)*W,(.5-y/2048)*H,z];
 const mat=(color,metal=.6)=>new THREE.MeshStandardMaterial({color,metalness:metal,roughness:.31,side:THREE.DoubleSide});
 const gold=mat(0xffbd68,.9),dark=mat(0x211414,.8),amber=new THREE.MeshBasicMaterial({color:0xffb54b,transparent:true,opacity:.72,depthWrite:false});
 const disk=new THREE.Group();disk.position.set(...pos(1438,337,.095));root.add(disk);
 const dr=.151;
 const discBody=new THREE.Mesh(new THREE.CylinderGeometry(dr,dr,.021,88),dark);discBody.rotation.x=Math.PI/2;disk.add(discBody);
 const discFace=new THREE.Mesh(new THREE.CircleGeometry(dr*.99,88),new THREE.MeshStandardMaterial({color:0x211910,metalness:.9,roughness:.18,side:THREE.DoubleSide}));discFace.position.z=.015;disk.add(discFace);
 for(let i=0;i<22;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(dr*(.29+i*.031),.00055,4,96),i%5===0?gold:mat(0x68402c,.85));ring.position.z=.017;disk.add(ring);}
 const label=new THREE.Mesh(new THREE.CircleGeometry(dr*.27,48),mat(0xf7ad45,.3));label.position.z=.019;disk.add(label);
 const inner=new THREE.Mesh(new THREE.CircleGeometry(dr*.07,32),dark);inner.position.z=.022;disk.add(inner);
 // The cassette stays in the bottom-left where it belongs, underneath the
 // original gold "Join Us" lettering. Only its mechanisms move.
 const tape=new THREE.Group();tape.position.set(...pos(151,1820,.025));tape.rotation.z=.21;root.add(tape);
 const cw=.27,ch=.157;
 const deck=new THREE.Mesh(new THREE.BoxGeometry(cw,ch,.015),mat(0x69432b,.58));tape.add(deck);
 const face=new THREE.Mesh(new THREE.PlaneGeometry(cw*.97,ch*.88),mat(0x2a1812,.42));face.position.z=.009;tape.add(face);
 const tapeWindow=new THREE.Mesh(new THREE.PlaneGeometry(cw*.73,ch*.44),new THREE.MeshBasicMaterial({color:0x130b09}));tapeWindow.position.set(0,.003,.012);tape.add(tapeWindow);
 const reels=[];for(let j of [-1,1]){const reel=new THREE.Group();reel.position.set(j*cw*.19,.007,.018);tape.add(reel);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(ch*.17,.003,8,40),gold);reel.add(rim);
  for(let k=0;k<6;k++){const a=k*Math.PI/3,spoke=new THREE.Mesh(new THREE.BoxGeometry(ch*.23,.005,.006),gold);spoke.position.set(Math.cos(a)*ch*.115,Math.sin(a)*ch*.115,.002);spoke.rotation.z=a;reel.add(spoke);}
  const pin=new THREE.Mesh(new THREE.CircleGeometry(ch*.038,16),gold);pin.position.z=.007;reel.add(pin);reels.push(reel);
 }
 const rimTape=new THREE.LineSegments(new THREE.EdgesGeometry(deck.geometry),new THREE.LineBasicMaterial({color:0xf4bd73}));tape.add(rimTape);
 // Raised stage lettering from the ACTUAL invite is extracted client-side
 // from the hosted original texture, not replaced by a generic typeface.
 const print=new THREE.Group();root.add(print);
 const textParts=[
   [183,790,1090,230,.071],[355,995,735,120,.067],
   [464,300,560,385,.075],[218,1690,1040,192,.049]
 ];
 const lightWords=[];
 const srcImage=new Image();srcImage.src='./assets/finale-invitation.webp';
 srcImage.onload=()=>{
  for(let n=0;n<textParts.length;n++){
   const [x,y,w,h,z]=textParts[n],cv=document.createElement('canvas');cv.width=Math.min(700,w);cv.height=Math.max(1,Math.round(cv.width*h/w));
   const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(srcImage,x,y,w,h,0,0,cv.width,cv.height);
   const pixels=ctx.getImageData(0,0,cv.width,cv.height);
   for(let k=0;k<pixels.data.length;k+=4){const r=pixels.data[k],g=pixels.data[k+1],b=pixels.data[k+2];
    // Remove dark poster texture and keep the bright ORIGINAL ink / star.
    const bright=Math.max(r,g,b),warm=r>g*.98&&g>b*.87;
    const a=Math.max(0,Math.min(255,(bright-112)*2.6))*(warm?1:.7);
    pixels.data[k+3]=Math.round(a);
   }
   ctx.putImageData(pixels,0,0);const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;
   const layer=new THREE.Group();layer.position.set(...pos(x+w/2,y+h/2,z));print.add(layer);
   const ww=w/1441,hh=h/1441;
   for(let d=4;d>=0;d--){const plane=new THREE.Mesh(new THREE.PlaneGeometry(ww,hh),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:d===0?.92:.25,color:d===0?0xffffff:0xb84d19,depthWrite:false,side:THREE.DoubleSide}));
    plane.position.set(-d*.001,d*.0005,-d*.005);layer.add(plane);}
   lightWords.push(layer);
  }
 };
 srcImage.onerror=()=>console.warn('Finale animated text texture unavailable; 3D mechanical parts remain active');
 // Three actual shaped glass bulbs, with light on the filament and no
 // rectangle-backed glow image planes.
 const bulbs=[];for(const [j,x,y] of [[0,53,187],[1,1063,62],[2,1217,158]]){
  const g=new THREE.Group();g.position.set(...pos(x,y,.075));root.add(g);
  const scale=.026;const glass=new THREE.Mesh(new THREE.SphereGeometry(scale*.48,18,18),new THREE.MeshPhysicalMaterial({color:0xffc57c,transparent:true,opacity:.22,roughness:.18,transmission:.38,emissive:0xff9c27,emissiveIntensity:0}));
  glass.scale.set(.72,1,1);glass.position.y=-.012;g.add(glass);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.006,.008,.014,12),dark);base.position.y=.010;g.add(base);
  const filament=new THREE.Mesh(new THREE.TorusGeometry(.005,.0016,6,20),new THREE.MeshBasicMaterial({color:0xfff2ae}));filament.position.y=-.016;g.add(filament);
  const point=new THREE.PointLight(0xffb34c,0,.24,2);point.position.set(0,-.016,.028);g.add(point);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:makeGlowTexture(),color:0xffc66c,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
  glow.scale.set(.098,.105,1);glow.position.set(0,-.016,.018);g.add(glow);
  bulbs.push({g,glass,filament,point,glow,j});
 }
 // Real modeled microphone: metal grille and shaft on right edge.
 const mic=new THREE.Group();mic.position.set(...pos(1380,1700,.10));mic.rotation.z=-.24;root.add(mic);
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.014,.021,.23,20),dark);stem.position.y=-.07;mic.add(stem);
 const grille=new THREE.Mesh(new THREE.SphereGeometry(.046,28,20),mat(0xd9a766,.93));grille.scale.set(.78,1.15,.8);grille.position.y=.065;mic.add(grille);
 for(let i=0;i<9;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(.031+i*.0006,.0009,5,40),dark);r.rotation.x=Math.PI/2;r.position.set(0,.030+i*.008,.035);mic.add(r);}
 const micLight=new THREE.PointLight(0xffe0a0,0,.25,2);micLight.position.set(.04,.08,.06);mic.add(micLight);
 // Sparse 3D spark field, anchored to the poster rather than the screen.
 const count=85,coords=new Float32Array(count*3),vel=new Float32Array(count);
 for(let i=0;i<count;i++){coords[i*3]=(Math.random()-.5)*1.15;coords[i*3+1]=(Math.random()-.5)*H;coords[i*3+2]=.08+Math.random()*.19;vel[i]=.04+Math.random()*.13;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(coords,3));
 const sparks=new THREE.Points(geo,new THREE.PointsMaterial({color:0xffa74c,size:.003,transparent:true,opacity:.78,depthWrite:false,blending:THREE.AdditiveBlending}));root.add(sparks);
 let elapsed=0;
 function update(dt){if(!root.visible)return;elapsed+=Math.min(dt,.05);const t=elapsed;
  disk.rotation.z=-t*1.7;
  reels[0].rotation.z=t*7.1;reels[1].rotation.z=-t*6.4;
  tape.rotation.z=.21+Math.sin(t*25)*.0015;
  mic.rotation.y=Math.sin(t*.6)*.14;micLight.intensity=.75+Math.sin(t*1.7)**2;
  for(const b of bulbs){const cycle=(t-b.j*.66+1000)%6.4,on=cycle>.34&&cycle<5.4;
   const power=on?(cycle<.6?.5:1)*(.85+.15*Math.sin(t*20+b.j)**2):0;
   b.glass.material.emissiveIntensity=power*2.4;b.glass.material.opacity=.12+power*.42;
   b.point.intensity=power*1.7;b.glow.material.opacity=power*.82;
   b.filament.material.color.setHex(power?0xfff3a8:0x5b2d15);b.g.rotation.z=Math.sin(t*.8+b.j)*.012;
  }
  lightWords.forEach((x,i)=>{x.position.z=textParts[i][4]+Math.sin(t*.9+i)*.009;});
  for(let i=0;i<count;i++){coords[i*3+1]+=vel[i]*dt;if(coords[i*3+1]>H*.5)coords[i*3+1]=-H*.5;}
  geo.attributes.position.needsUpdate=true;
 }
 return {root,update,dispose(){root.parent?.remove(root);root.traverse(o=>{o.geometry?.dispose?.();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose?.());}});}};
}
let _glowTexture=null;
function makeGlowTexture(){if(_glowTexture)return _glowTexture;const cv=document.createElement('canvas');cv.width=cv.height=96;const c=cv.getContext('2d');const g=c.createRadialGradient(48,48,0,48,48,47);g.addColorStop(0,'rgba(255,253,195,1)');g.addColorStop(.19,'rgba(255,187,69,.62)');g.addColorStop(.6,'rgba(255,144,30,.13)');g.addColorStop(1,'rgba(255,144,30,0)');c.fillStyle=g;c.fillRect(0,0,96,96);return _glowTexture=new THREE.CanvasTexture(cv);}
