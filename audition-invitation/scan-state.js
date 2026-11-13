export function createScanGate(){let active=false,started=false,elapsed=0,duration=1.6,fresh=true;return{
 found(){fresh=!started;duration=fresh?1.6:.45;elapsed=0;active=true;return{fresh,duration};},
 lost(){active=false;elapsed=0;},reset(){active=false;started=false;elapsed=0;fresh=true;},
 advance(delta,{tracked,visible,playing}){if(!active||!tracked||!visible||!playing)return false;elapsed+=Math.max(0,Math.min(delta,.1));if(elapsed+1e-6>=duration){active=false;started=true;return true;}return false;},
 get active(){return active;},get fresh(){return fresh;},get progress(){return Math.min(1,elapsed/duration);},get started(){return started;}
};}
