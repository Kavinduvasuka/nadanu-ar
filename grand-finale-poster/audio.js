// Original 80s-inspired score, rendered as stereo audio for consistent playback.
export function createMusic(){const track=new Audio('assets/nadanu-retro-score.m4a');track.preload='auto';track.volume=.72;let ready=false;
 return {async unlock(){if(ready)return;await track.play();track.pause();track.currentTime=0;ready=true;},async start(reset=false,time=null){if(reset||time!==null&&Math.abs(track.currentTime-time)>.18){try{track.currentTime=Math.max(0,Math.min(time??0,(track.duration||34)-.02));}catch{}}if(track.paused)await track.play();},stop(){track.pause();},dispose(){track.pause();track.removeAttribute('src');track.load();}};
}
