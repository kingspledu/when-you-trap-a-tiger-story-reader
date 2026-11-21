/* Optional HTML media transport. Phone-lock transition behavior requires device QA. */
class TigerMediaPlayer extends EventTarget{
 constructor(){super();this.media=document.createElement('audio');this.media.preload='auto';this.media.setAttribute('playsinline','');document.body.append(this.media);this.track=null;this.index=0;this.position=0;this.speed=1;this.wanted=false;this.serial=0;this.transitioning=false;
 this.media.addEventListener('timeupdate',()=>{const s=this.track?.segments[this.index];if(s&&this.wanted&&!this.transitioning&&this.media.currentTime>=s.trim_end-.015)this.advance();});
 this.media.addEventListener('ended',()=>{if(this.wanted&&!this.transitioning)this.advance()});
 this.media.addEventListener('pause',()=>{if(!this.transitioning&&!this.media.ended){this.wanted=false;this.dispatchEvent(new Event('pause'))}});
 this.media.addEventListener('error',()=>{if(!this.transitioning)this.dispatchEvent(new Event('error'))});
 }
 get paused(){return !this.wanted||this.media.paused}
 get currentTime(){const s=this.track?.segments[this.index];return s?Math.min(s.offset+s.duration,s.offset+Math.max(0,this.media.currentTime-s.trim_start)):0}
 set currentTime(value){this.seek(Number(value)||0,this.wanted).catch(()=>this.dispatchEvent(new Event('error')))}
 get playbackRate(){return this.speed}set playbackRate(v){this.speed=Number(v);this.media.playbackRate=this.speed}
 setTrack(t){this.pause();this.track=t;this.index=0;this.position=0;this.media.removeAttribute('src');this.media.load()}
 async seek(value,autoplay){if(!this.track)return;const ticket=++this.serial;this.transitioning=true;this.media.pause();this.wanted=autoplay;
 let i=this.track.segments.findIndex(s=>s.offset+s.duration>value);if(i<0)i=this.track.segments.length-1;this.index=i;const s=this.track.segments[i];const offset=s.trim_start+Math.max(0,value-s.offset);
 this.media.src=s.src;this.media.playbackRate=this.speed;this.media.currentTime=Math.min(offset,s.trim_end-.001);this.transitioning=false;this.dispatchEvent(new Event('seeked'));if(autoplay&&ticket===this.serial){await this.media.play();this.dispatchEvent(new Event('play'))}}
 async play(){if(navigator.audioSession)try{navigator.audioSession.type='playback'}catch{}this.wanted=true;if(!this.media.getAttribute('src'))return this.seek(this.position,true);await this.media.play();this.dispatchEvent(new Event('play'))}
 pause(){this.wanted=false;this.media.pause();this.position=this.currentTime;this.dispatchEvent(new Event('pause'))}
 async advance(){if(this.index+1>=this.track.segments.length){this.wanted=false;this.dispatchEvent(new Event('ended'));return}try{await this.seek(this.track.segments[this.index+1].offset,true)}catch{this.wanted=false;this.dispatchEvent(new Event('error'))}}
 load(){this.media.load()}
 destroy(){this.pause();this.serial++;this.media.removeAttribute('src');this.media.load();this.media.remove()}
}
