/* Nadanu Grand Finale — inline category gallery, 3x2 grid and arrow pagination. */
(() => {
'use strict';
const finalists=[["Anjula Pragathi","solo-singing","anjula-pragathi"],["Gihana Daphni Fitsroy Mendis","solo-singing","daphni-mendis"],["Gayathri Anjalika Konara","solo-singing","gayathri-anjalika"],["Imesha Uddheepani","solo-singing","imesha-uddheepani"],["Inshira Nipun","solo-singing","ishira-nipun"],["Kisandi Wethara","solo-singing","kisandi-wethara"],["Misheala Wanigaratnam","solo-singing","misheala-wanigaratnam"],["Omalie Karunaratna","solo-singing","omalmie-karunaratne"],["Sanesh Ayuka Perera","solo-singing","senesh-perera"],["Tharinsa S. Liyanage","solo-singing","tharinsa-s-liyanage"],["Theekshana Ranaweera","solo-singing","theekshana-ranaweera"],["Viveka Anthony Sivasithamparam","solo-singing","vivekh-sivasithamparam"],["Chathicl Sandew","solo-singing","chathicl-sandew"],["A.W Dinuka Thimansa","solo-dancing","dinuka-thimansa"],["Gigiri Perera","solo-dancing","gigiri-perera"],["Mashi Disssanayake","solo-dancing","mashi-dissanayake"],["Sanjana","solo-dancing","sanjana-mendis"],["K.T.D. Sasemi Thisasna","solo-dancing","sasemi-thisasna"],["Siluni Batuwantdawa","solo-dancing","siluni-batuwantudawa"],["Sithumini Dilrangi","solo-dancing","sithumini-dilarangi"],["Sudheepa Chithravel","solo-dancing","sudheepa-chithravel"],["Logithan","group-dancing","logithan-and-team"],["Pavatharani Vijayasundaram","group-dancing","pavatharani-and-team"],["P.B. Tharindi Nimnadi Senarathna","group-dancing","tharindi-and-team"]];
const categoryData={
 'solo-singing':{title:'Solo Singing',subtitle:'Thirteen voices. One stage. Meet our Grand Finale vocalists.',number:'01'},
 'solo-dancing':{title:'Solo Dancing',subtitle:'Eight solo dancers taking their moment in the spotlight.',number:'02'},
 'group-dancing':{title:'Group Dancing',subtitle:'Three group dancing entries taking the Grand Finale stage.',number:'03'}
};
const categories=['solo-singing','solo-dancing','group-dancing'];
const slides=[];
for(const cat of categories){
 const people=finalists.filter(p=>p[1]===cat);
 slides.push({cat,people});
}
const grid=document.getElementById('finalistsGrid');
const previous=document.getElementById('finalistsPrev');
const next=document.getElementById('finalistsNext');
const indexLabel=document.getElementById('finalistsPageIndex');
const select=document.getElementById('finalistsCategorySelect');
const title=document.getElementById('finalistsTitle');
const subtitle=document.getElementById('finalistsSubtitle');
const watermark=document.getElementById('finalistsWatermark');
if(!grid||!previous||!next||!select)return;
let active=0;
function makeCard([name,category,slug]){
 const card=document.createElement('article');card.className='finalist-card';
 if(slug==='sanjana-mendis')card.classList.add('finalist-card--sanjana');
 const frame=document.createElement('div');frame.className='finalist-photo-frame';
 const img=document.createElement('img');
 img.src='assets/finalists/'+category+'/'+slug+'.webp';
 img.alt=name+' — '+categoryData[category].title;
 img.loading='lazy';img.decoding='async';
 const fallback=document.createElement('span');fallback.className='finalist-photo-fallback';fallback.textContent='PHOTO COMING SOON';
 img.addEventListener('error',()=>{img.hidden=true;frame.classList.add('finalist-photo-missing')},{once:true});
 frame.append(img,fallback);
 const info=document.createElement('div');info.className='finalist-info';
 const h=document.createElement('h3');h.textContent=name;
 info.appendChild(h);card.append(frame,info);return card;
}
function show(slideNumber){
 active=(slideNumber+slides.length)%slides.length;
 const slide=slides[active],data=categoryData[slide.cat];
 grid.classList.remove('finalists-grid--pending');
 grid.replaceChildren(...slide.people.map(makeCard));
 grid.classList.remove('finalists-grid-enter');void grid.offsetWidth;grid.classList.add('finalists-grid-enter');
 if(indexLabel)indexLabel.textContent=(active+1)+' / '+slides.length;
 if(title)title.innerHTML=data.title.replace(' ', '<br><em>')+'.</em>';
 if(subtitle)subtitle.textContent=data.subtitle;
 if(watermark)watermark.textContent=data.number;
 select.value=slide.cat;
}
previous.addEventListener('click',()=>show(active-1));
next.addEventListener('click',()=>show(active+1));
select.addEventListener('change',()=>{const first=slides.findIndex(s=>s.cat===select.value);if(first>=0)show(first)});
const wrapper=document.querySelector('.finalists-showcase');
if(wrapper){
 let x=0,y=0;
 wrapper.addEventListener('touchstart',e=>{if(e.touches.length===1){x=e.touches[0].clientX;y=e.touches[0].clientY}},{passive:true});
 wrapper.addEventListener('touchend',e=>{if(!x||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.4)show(active+(dx<0?1:-1));x=0},{passive:true});
}
show(0);
})();