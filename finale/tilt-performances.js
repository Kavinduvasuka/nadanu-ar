import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// The same three Nadanu character GLBs as the original Finale AR show.
export function createTiltPerformances(parent,onStatus=()=>{}){
 const root=new THREE.Group();parent.add(root);
 const stage=new THREE.Group();stage.scale.setScalar(.112);stage.rotation.x=.52;root.add(stage);
 const loader=new GLTFLoader(),draco=new DRACOLoader();
 draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
 loader.setDRACOLoader(draco);
 const acts=[
  {path:'./assets/singer.glb',name:'SOLO SINGING',height:2.25,width:3,scale:3.35,z:1},
  {path:'./assets/solo-dancer.glb?v=optimized-20261106',name:'SOLO DANCING',height:2.25,width:3,scale:3.35,z:1},
  {path:'./assets/group_dancers.glb',name:'GROUP DANCING',height:2.6,width:6.7,scale:1.8,z:0}
 ];
 const performers=acts.map(()=>new THREE.Group());
 const mixers=[],ready=[false,false,false],failed=[false,false,false];
 const rings=[],bars=[],lights=[],particlesCount=180;
 const disc=new THREE.Mesh(new THREE.CircleGeometry(6,72),new THREE.MeshStandardMaterial({color:0x170c27,metalness:.7,roughness:.24,side:THREE.DoubleSide}));
 disc.rotation.x=-Math.PI/2;stage.add(disc);
 const color=[0xff3d9a,0x33e1ff,0xffc857];
 [1.7,3,4.3,5.5].forEach((radius,i)=>{
  const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.075,72),new THREE.MeshBasicMaterial({color:color[i%3],transparent:true,opacity:.48,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.03+i*.006;stage.add(ring);rings.push(ring);
 });
 for(let i=0;i<36;i++){
  const a=i/36*Math.PI*2,bar=new THREE.Mesh(new THREE.BoxGeometry(.14,1,.14),new THREE.MeshBasicMaterial({color:color[i%3]}));
  bar.position.set(Math.sin(a)*5.5,.5,Math.cos(a)*5.5);stage.add(bar);bars.push(bar);
 }
 color.forEach((c,i)=>{
  const light=new THREE.SpotLight(c,2.6,27,.55,.7,1);
  light.position.set(Math.cos(i*2.09)*4,7,Math.sin(i*2.09)*4);
  light.target.position.set(0,1,0);stage.add(light,light.target);lights.push(light);
 });
 performers.forEach((group,i)=>{group.scale.setScalar(acts[i].scale);group.position.z=acts[i].z;stage.add(group);});
 const positions=new Float32Array(particlesCount*3);
 for(let i=0;i<particlesCount;i++){positions[i*3]=(Math.random()-.5)*10;positions[i*3+1]=Math.random()*7;positions[i*3+2]=(Math.random()-.5)*10;}
 const sparkGeometry=new THREE.BufferGeometry();sparkGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const sparks=new THREE.Points(sparkGeometry,new THREE.PointsMaterial({color:0xffc78c,size:.08,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending}));stage.add(sparks);
 let cancelled=false,elapsed=0;
 async function load(){
  for(let i=0;i<acts.length;i++){
   if(cancelled)break;
   const spec=acts[i];
   try{
    onStatus('Preparing '+spec.name+'…');
    const gltf=await loader.loadAsync(spec.path);
    if(cancelled)break;
    const object=gltf.scene;object.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(object);
    const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    if(!Number.isFinite(size.y)||size.y<1e-5)throw Error('Invalid 3D actor model');
    const scale=Math.min(spec.height/size.y,spec.width/Math.max(size.x,1e-6));
    object.scale.multiplyScalar(scale);
    object.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
    object.traverse(n=>{if(n.isMesh||n.isSkinnedMesh)n.frustumCulled=false;});
    performers[i].add(object);ready[i]=true;
    if(gltf.animations?.length){
     const mixer=new THREE.AnimationMixer(object);
     mixer.clipAction(gltf.animations[0]).setLoop(THREE.LoopRepeat,Infinity).play();
     mixers.push(mixer);
    }
   }catch(e){failed[i]=true;console.warn(spec.name+' loading failed:',e);}
   await new Promise(resolve=>setTimeout(resolve,110));
  }
 }
 function update(dt){
  const index=Math.min(2,Math.floor(elapsed/8));
  if(ready[index]||failed[index])elapsed+=dt;
  performers.forEach((m,i)=>m.visible=i===index&&ready[i]);
  mixers.forEach(m=>m.update(dt));
  const pulse=Math.sin(elapsed*5)**2;
  rings.forEach((m,i)=>{m.material.opacity=.35+pulse*.3;m.scale.setScalar(1+pulse*.03*(i+1));});
  bars.forEach((m,i)=>{const h=.6+(1+Math.sin(elapsed*3+i*.73))*1.7+pulse*.6;m.scale.y=h;m.position.y=h/2;});
  lights.forEach((m,i)=>{const a=elapsed*.5+i*2.09;m.position.x=Math.cos(a)*4;m.position.z=Math.sin(a)*4;m.target.position.x=Math.sin(a)*1.2;});
  for(let i=0;i<particlesCount;i++){positions[i*3+1]+=.25*dt;if(positions[i*3+1]>7)positions[i*3+1]=0;}
  sparkGeometry.attributes.position.needsUpdate=true;
  return {index,done:elapsed>=24,label:acts[index].name,loading:!ready[index]&&!failed[index]};
 }
 function dispose(){cancelled=true;root.parent?.remove(root);root.traverse(o=>{o.geometry?.dispose?.();if(o.material){for(const mat of(Array.isArray(o.material)?o.material:[o.material]))mat.dispose?.();}});draco.dispose();}
 return {root,load,update,dispose,reset(){elapsed=0},get elapsed(){return elapsed}};
}
