import {JUDGE_SCENES} from './judges-stage.js?v=invitation-only-3';
export const ACTS=JUDGE_SCENES.map((s,i)=>({type:i===JUDGE_SCENES.length-1?'finale':'judges-welcome',title:s.lines.join(' '),kicker:s.kicker,copy:s.copy.join(' · '),duration:s.end-s.start}));
export const TOTAL=ACTS.reduce((n,a)=>n+a.duration,0);
export const startOf=i=>ACTS.slice(0,i).reduce((n,a)=>n+a.duration,0);
export function position(time){let start=0;for(let i=0;i<ACTS.length;i++){if(time<start+ACTS[i].duration||i===ACTS.length-1)return{index:i,act:ACTS[i],local:Math.max(0,Math.min(ACTS[i].duration,time-start)),start};start+=ACTS[i].duration;}}
