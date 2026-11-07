/* Nadanu Grand Finale — names and categories from supplied finalists ZIP; photos stored locally. */
(() => {
'use strict';
const finalists=[["Anjula Pragathi","solo-singing","anjula-pragathi"],["Daphni Mendis","solo-singing","daphni-mendis"],["Imesha Uddheepani","solo-singing","imesha-uddheepani"],["Ishira Nipun","solo-singing","ishira-nipun"],["Kisandi Wethara","solo-singing","kisandi-wethara"],["Misheala Wanigaratnam","solo-singing","misheala-wanigaratnam"],["Omalmie Karunaratne","solo-singing","omalmie-karunaratne"],["Senesh Perera","solo-singing","senesh-perera"],["Tharinsa S. Liyanage","solo-singing","tharinsa-s-liyanage"],["Theekshana Ranaweera","solo-singing","theekshana-ranaweera"],["Vivekh Sivasithamparam","solo-singing","vivekh-sivasithamparam"],["Dinuka Thimansa","solo-dancing","dinuka-thimansa"],["Gigiri Perera","solo-dancing","gigiri-perera"],["Sanjana Mendis","solo-dancing","sanjana-mendis"],["Siluni Batuwantudawa","solo-dancing","siluni-batuwantudawa"],["Sithumini Dilarangi","solo-dancing","sithumini-dilarangi"],["Sanjana Mendis","group-dancing","sanjana-mendis"],["Sasemi Thisasna","group-dancing","sasemi-thisasna"]];
const categories={'solo-singing':'Solo Singing','solo-dancing':'Solo Dancing','group-dancing':'Group Dancing'};
const grid=document.getElementById('finalistsGrid');
const pageCategory=document.body.dataset.finalistCategory||'all';
const filters=document.querySelectorAll('[data-finalist-filter]');
if(!grid)return;
const cards=finalists.filter(([,category])=>pageCategory==='all'||category===pageCategory).map(([name,category,slug],idx)=>{
  const article=document.createElement('article');
  article.className='finalist-card';
  article.dataset.category=category;
  article.style.setProperty('--stagger',String(idx%6));
  const frame=document.createElement('div');
  frame.className='finalist-photo-frame';
  const image=document.createElement('img');
  image.loading='lazy';image.decoding='async';image.alt='Finalist photo: '+name;
  image.src='assets/finalists/'+category+'/'+slug+'.webp';
  image.addEventListener('error',()=>{
    image.hidden=true;frame.classList.add('finalist-photo-missing');
  },{once:true});
  const fallback=document.createElement('span');fallback.className='finalist-photo-fallback';fallback.textContent='PHOTO COMING SOON';
  frame.append(image,fallback);
  const info=document.createElement('div');info.className='finalist-info';
  const cat=document.createElement('span');cat.className='finalist-category';cat.textContent=categories[category];
  const title=document.createElement('h3');title.textContent=name;
  info.append(cat,title);article.append(frame,info);
  return article;
});
grid.replaceChildren(...cards);
const count=document.getElementById('finalistsCount');
function setFilter(filter){
 let visible=0;
 for(const card of cards){
  const show=filter==='all'||card.dataset.category===filter;
  card.hidden=!show;if(show)visible++;
 }
 for(const button of filters){
  const chosen=button.dataset.finalistFilter===filter;
  button.setAttribute('aria-pressed',String(chosen));
 }
 if(count)count.textContent=visible+' finalist'+(visible===1?'':'s');
}
for(const button of filters)button.addEventListener('click',()=>setFilter(button.dataset.finalistFilter));
setFilter(pageCategory);
})();