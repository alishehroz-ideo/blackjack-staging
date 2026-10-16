let ctx,loop,step=0,enabled=false,musicBus,fxBus;const voices=new Set();
function init(){if(ctx)return;ctx=new AudioContext({latencyHint:'interactive'});musicBus=ctx.createGain();fxBus=ctx.createGain();musicBus.gain.value=.5;fxBus.gain.value=.7;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=5;musicBus.connect(limiter);fxBus.connect(limiter);limiter.connect(ctx.destination)}
function note(hz,at,duration,volume,bus,type='sine'){if(!ctx||!enabled)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=hz;o.connect(g).connect(bus);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(volume,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.start(at);o.stop(at+duration+.02);if(bus===musicBus){voices.add(o);o.onended=()=>voices.delete(o)}}
export async function setSound(on){enabled=on;if(on){init();await ctx.resume()}else{stopMusic();if(ctx)await ctx.suspend()}}
const chords=[[261.63,329.63,392,493.88],[220,261.63,329.63,392],[293.66,349.23,440,523.25],[196,246.94,293.66,349.23]];
function brush(t,v){const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.09),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/ctx.sampleRate*65)*v;const o=ctx.createBufferSource();o.buffer=buffer;o.connect(musicBus);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect()};o.start(t)}
function beat(){if(!enabled||document.hidden)return;const c=chords[Math.floor(step/4)%4],t=ctx.currentTime,b=60/132;note(c[step%4]/2,t,.3,.17,musicBus,'triangle');c.forEach(f=>note(f,t+(step%2?.08:0),.25,.04,musicBus));note(c[(step+1)%4]*2,t+b*.66,.22,.09,musicBus);brush(t,.025);brush(t+b*.66,.02);if(step%2)brush(t,.045);step++}
export function startMusic(){stopMusic();if(!enabled)return;step=0;beat();loop=setInterval(beat,60000/132)}
export function stopMusic(){clearInterval(loop);for(const o of voices){try{o.stop()}catch{}}voices.clear()}
export function fx(kind){if(!ctx||!enabled||document.hidden)return;const t=ctx.currentTime;const play=(seq,d=.16,v=.045)=>seq.forEach((h,i)=>note(h,t+i*.075,d,v,fxBus));if(kind==='place')cardSlide(t);else if(kind==='bust')play([293.66,220,164.81],.22,.045);else if(kind==='blackjack')play([523.25,659.25,783.99,1046.5],.45);else if(kind==='charlie')play([392,523.25,659.25,783.99,1046.5],.3);else if(kind==='combo')play([659.25,783.99,1046.5,1318.51],.35);else if(kind==='end'||kind==='complete')fanfare(t);else play([523.25,659.25,783.99],.25)}
document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend();else if(enabled)ctx.resume()});

// Filtered paper friction followed by a soft tabletop contact; no pitched beep.
function cardSlide(at){
 const duration=.15,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
 source.buffer=buffer;filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(2600,at);filter.frequency.exponentialRampToValueAtTime(850,at+duration);
 gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.14,at+.012);gain.gain.exponentialRampToValueAtTime(.025,at+.075);gain.gain.exponentialRampToValueAtTime(.08,at+.087);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
 source.connect(filter).connect(gain).connect(fxBus);source.start(at);source.stop(at+duration);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};
}

function fanfare(t){
 [1046.5,1318.51,1567.98,2093,1567.98,2093].forEach((f,i)=>{note(f,t+i*.075,.35,.035,fxBus);note(f*2.73,t+i*.075,.16,.009,fxBus)});
 [1046.5,1318.51,1567.98].forEach(f=>note(f,t+.52,.85,.026,fxBus));
}
