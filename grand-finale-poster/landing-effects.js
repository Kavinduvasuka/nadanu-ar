(()=>{'use strict';
const landing=document.getElementById('landing');if(!landing)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cards=[...landing.querySelectorAll('.performance-art-card')];
const palettes=[['#ffba5a','#ff6838'],['#bb8bff','#fb66a9'],['#ffc05a','#ff7e32']];
function resize(){cards.forEach(card=>{const cv=card.querySelector('canvas'),r=cv.getBoundingClientRect();if(!r.width)return;const p=Math.min(devicePixelRatio||1,1.6);cv.width=r.width*p;cv.height=r.height*p;cv.getContext('2d').setTransform(p,0,0,p,0,0);card._w=r.width;card._h=r.height;});}
function draw(card,t){if(!card._w)return;const cv=card.querySelector('canvas'),g=cv.getContext('2d'),w=card._w,h=card._h,k=+card.dataset.art,r=Math.min(w,h)*.38;g.clearRect(0,0,w,h);g.save();g.translate(w/2,h/2);if(!reduced)g.rotate(Math.sin(t*.0004+k)*.085);g.lineWidth=.85;
const glow=g.createRadialGradient(0,0,0,0,0,r*1.4);glow.addColorStop(0,k===1?'#ac5eff27':'#ff7e3828');glow.addColorStop(1,'#ff662000');g.fillStyle=glow;g.fillRect(-w/2,-h/2,w,h);
for(let i=0;i<90;i++){const a=i/90*Math.PI*2,b=a+(k===0?2.3:k===1?2.85:1.8)+(k===2?Math.sin(a*5)*.42:0);g.globalAlpha=.13+.34*Math.sin(i/90*Math.PI)**2;g.strokeStyle=palettes[k][i%2];g.beginPath();g.moveTo(Math.cos(a)*r,Math.sin(a)*r);g.lineTo(Math.cos(b)*r*.94,Math.sin(b)*r*.94);g.stroke();}
g.globalAlpha=.8;g.strokeStyle=palettes[k][0];g.beginPath();g.arc(0,0,r*.98,0,2*Math.PI);g.stroke();g.globalAlpha=1;g.textAlign='center';g.textBaseline='middle';g.font='bold '+Math.max(31,r*.55)+'px Arial';g.fillStyle='#ffedc8';g.shadowColor=palettes[k][0];g.shadowBlur=22;g.fillText(['♫','✦','♪'][k],0,0);g.restore();}
const io='IntersectionObserver'in window?new IntersectionObserver(es=>es.forEach(e=>{e.target._visible=e.isIntersecting;if(e.isIntersecting)e.target.classList.add('is-visible');}),{threshold:.1}):null;
cards.forEach(card=>{if(io)io.observe(card);else card.classList.add('is-visible');});
function frame(t){if(!document.hidden&&landing.style.display!=='none')cards.forEach(c=>{if(c._visible!==false)draw(c,t)});requestAnimationFrame(frame);}
if('ResizeObserver'in window)new ResizeObserver(resize).observe(landing);else addEventListener('resize',resize);resize();requestAnimationFrame(frame);
})();