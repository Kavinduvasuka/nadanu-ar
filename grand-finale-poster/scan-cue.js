export function createScanCue(){let ctx,output,active=[];return{
 async unlock(){if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();output=ctx.createGain();output.gain.value=.065;output.connect(ctx.destination);}await ctx.resume();},
 play(){if(!ctx||ctx.state!=='running')return;const now=ctx.currentTime;for(const [i,f]of [659.25,880].entries()){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;const at=now+i*.10;g.gain.setValueAtTime(.001,at);g.gain.exponentialRampToValueAtTime(.55,at+.012);g.gain.exponentialRampToValueAtTime(.001,at+.25);o.connect(g);g.connect(output);o.start(at);o.stop(at+.27);active.push(o);o.onended=()=>{active=active.filter(x=>x!==o);o.disconnect();g.disconnect();};}},
 stop(){for(const o of active){try{o.stop();}catch{}}active=[];}
};}
