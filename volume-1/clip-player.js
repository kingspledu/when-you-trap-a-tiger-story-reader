/* Individual MP3s, sample-clock scheduling; paragraph cuts happen only in browser. */
class TigerClipPlayer extends EventTarget{
 constructor(){super();this.ctx=null;this.track=null;this.running=false;this.position=0;this.anchor=0;this.anchorAt=0;this.speed=1;this.nodes=[];this.cache=new Map();this.pending=new Map();this.next=0;this.end=0;this.busy=false;this.epoch=0;this.timer=null;this.src='';}
 get paused(){return !this.running}
 get playbackRate(){return this.speed}
 set playbackRate(value){const pos=this.currentTime;this.stopNodes();this.speed=Number(value)||1;this.position=pos;this.reset();if(this.running)this.pump()}
 get currentTime(){if(!this.running||!this.ctx)return this.position;return Math.min(this.track?.duration||0,this.end,Math.max(this.position,this.anchor+(this.ctx.currentTime-this.anchorAt)*this.speed))}
 set currentTime(value){this.stopNodes();this.position=Math.max(0,Math.min(Number(value)||0,this.track?.duration||0));this.reset();if(this.running)this.pump();this.dispatchEvent(new Event('seeked'))}
 setTrack(track){this.pause();this.track=track;this.position=0;this.cache.clear();this.pending.clear();this.reset()}
 reset(){this.epoch++;this.busy=false;this.anchor=this.position;this.anchorAt=this.ctx?.currentTime||0;this.end=this.position;this.next=this.track?.segments.findIndex(s=>s.offset+s.duration>this.position)??0;if(this.next<0)this.next=this.track?.segments.length||0}
 stopNodes(){for(const item of this.nodes){try{item.node.stop()}catch{}item.node.disconnect();item.gain.disconnect()}this.nodes=[]}
 async buffer(i){
  const key=this.track.segments[i].src;if(this.cache.has(key))return this.cache.get(key);if(this.pending.has(key))return this.pending.get(key);
  const promise=(async()=>{let last;for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(key);if(!r.ok)throw Error(`Audio HTTP ${r.status}`);const b=await this.ctx.decodeAudioData(await r.arrayBuffer());this.cache.set(key,b);return b}catch(e){last=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)))}}throw last})().finally(()=>this.pending.delete(key));this.pending.set(key,promise);return promise;
 }
 async play(){
  if(navigator.audioSession)try{navigator.audioSession.type='playback'}catch{}
  if(!this.track)return;if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();await this.ctx.resume();if(this.running)return;
  if(this.position>=this.track.duration)this.position=0;this.running=true;this.reset();this.dispatchEvent(new Event('play'));clearInterval(this.timer);this.timer=setInterval(()=>this.pump(),100);await this.pump();
 }
 pause(){if(this.running)this.position=this.currentTime;this.running=false;clearInterval(this.timer);this.stopNodes();this.reset();this.dispatchEvent(new Event('pause'))}
 load(){this.cache.clear();this.pending.clear();this.currentTime=this.position}
 async pump(){
  if(!this.running||this.busy||!this.ctx||!this.track)return;this.busy=true;const epoch=this.epoch;
  try{
   for(let i=this.next;i<Math.min(this.track.segments.length,this.next+4);i++)this.buffer(i).catch(()=>{});
   while(this.next<this.track.segments.length&&this.running&&epoch===this.epoch){
    const i=this.next,s=this.track.segments[i];let when=this.anchorAt+(s.offset-this.anchor)/this.speed;
    if(when>this.ctx.currentTime+5)break;
    const buffer=await this.buffer(i);if(!this.running||epoch!==this.epoch)return;
    let local=Math.max(0,this.position-s.offset);when=this.anchorAt+(s.offset+local-this.anchor)/this.speed;
    // A network underrun freezes the virtual clock at the last scheduled sample.
    if(when<this.ctx.currentTime+.025){const shift=this.ctx.currentTime+.025-when;this.anchorAt+=shift;when+=shift}
    const remaining=s.duration-local;if(remaining<=0){this.next++;continue}
    const node=this.ctx.createBufferSource(),gain=this.ctx.createGain();node.buffer=buffer;node.playbackRate.value=this.speed;node.connect(gain);gain.connect(this.ctx.destination);
    const offset=s.trim_start+local;const playDuration=Math.min(remaining,buffer.duration-offset);if(playDuration<=0)throw Error('Invalid clip trim');
    // Declick only on trimmed silence edges. No overlapping spoken samples.
    gain.gain.setValueAtTime(s.trim_start>0&&local===0?0:1,when);if(s.trim_start>0&&local===0)gain.gain.linearRampToValueAtTime(1,when+.004/this.speed);
    if(s.trim_end<buffer.duration-.01){gain.gain.setValueAtTime(1,when+Math.max(0,playDuration-.004)/this.speed);gain.gain.linearRampToValueAtTime(0,when+playDuration/this.speed)}
    node.start(when,offset,playDuration);this.nodes.push({node,gain,index:i,when,until:when+playDuration/this.speed});this.end=s.offset+remaining+local;this.next++;
    node.onended=()=>{node.disconnect();gain.disconnect();this.nodes=this.nodes.filter(n=>n.node!==node);if(epoch===this.epoch&&this.running&&this.next===this.track.segments.length&&!this.nodes.length){this.position=this.track.duration;this.running=false;clearInterval(this.timer);this.dispatchEvent(new Event('ended'))}};
    // Keep only a short decoded window, not an entire book in memory.
    const keep=new Set(this.track.segments.slice(Math.max(0,i-2),i+7).map(x=>x.src));for(const key of this.cache.keys())if(!keep.has(key))this.cache.delete(key);
   }
  }catch(error){if(epoch===this.epoch){this.pause();this.dispatchEvent(new Event('error'));console.warn('Audiobook clip loading failed',error.message)}}finally{if(epoch===this.epoch)this.busy=false}
 }
}
