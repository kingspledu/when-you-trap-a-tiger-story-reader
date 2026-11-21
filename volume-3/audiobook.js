(()=>{
 'use strict';
 const root=document.documentElement, version='audio-20261121-v3';
 const panel=document.createElement('section');panel.className='audiobook';panel.setAttribute('aria-label','오디오북');
 panel.innerHTML=`<div class="audio-controls"><button type="button" class="audio-play" aria-label="오디오북 재생">▶ 듣기</button><button type="button" class="audio-prev" aria-label="이전 구간">⏮</button><button type="button" class="audio-next" aria-label="다음 구간">⏭</button><select class="audio-chapter" aria-label="오디오북 장 선택"></select><select class="audio-rate" aria-label="재생 속도"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select><label class="audio-follow"><input type="checkbox" checked>본문 따라가기</label><button type="button" class="audio-close" aria-label="오디오북 접기">⌄</button></div><div class="audio-progress"><input type="range" min="0" max="1" value="0" step="0.1" aria-label="장 재생 위치"><output>0:00 / 0:00</output></div><p class="audio-status" role="status" aria-live="polite">오디오북 준비 중…</p>`;
 document.body.append(panel);
 const $=s=>panel.querySelector(s), play=$('.audio-play'),chapter=$('.audio-chapter'),rate=$('.audio-rate'),seek=$('input[type=range]'),status=$('.audio-status'),output=$('output'),follow=$('.audio-follow input');
 const mediaMode=new URLSearchParams(location.search).get('audioMode')==='media';const audio=mediaMode?new TigerMediaPlayer():new TigerClipPlayer();let preloaded=null,book=null,track=null,index=0,loading=false,playing=false,frame=0,generation=0,retries=0,activeWord=null,activeSentences=[],lastFollow=null,saveAt=0,selection=0;
 const mode=document.createElement('a');const modeUrl=new URL(location.href);modeUrl.searchParams.set('audioMode',mediaMode?'precise':'media');mode.href=modeUrl.href;mode.textContent=mediaMode?'정밀 연결 모드로 전환':'호환 재생 모드 시험';mode.style.cssText='font-size:11px;text-decoration:underline';panel.append(mode);
 addEventListener('tiger-stop-audio',()=>{audio.pause();cancelAnimationFrame(frame);clear();if(audio.media){audio.media.removeAttribute('src');audio.media.load()}else{audio.cache.clear();audio.pending.clear();audio.ctx?.close();audio.ctx=null;}});
 const domWords=new Map(),sentenceNodes=new Map();const token=/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g;
 const storage='tiger-audiobook:'+location.pathname;
 if('mediaSession'in navigator){for(const [action,handler] of Object.entries({play:()=>audio.play().then(tick),pause:()=>{audio.pause();cancelAnimationFrame(frame)},previoustrack:()=>{const previous=book?.chapters.find(c=>c.chapter===track?.chapter-1);if(previous)select(previous.chapter,true)},nexttrack:()=>{const next=book?.chapters.find(c=>c.chapter===track?.chapter+1);if(next)select(next.chapter,true)},seekbackward:()=>{audio.currentTime=Math.max(0,audio.currentTime-15)},seekforward:()=>{audio.currentTime=Math.min(track?.duration||0,audio.currentTime+15)},seekto:e=>{audio.currentTime=e.seekTime}}))try{navigator.mediaSession.setActionHandler(action,handler)}catch{}}
 let saved;try{saved=JSON.parse(localStorage.getItem(storage)||'null')}catch{}
 const clock=t=>`${Math.floor(Math.max(0,t)/60)}:${String(Math.floor(Math.max(0,t)%60)).padStart(2,'0')}`;
 function wrap(ch){
  const section=document.getElementById(`chapter-${String(ch).padStart(3,'0')}`);
  for(const sentence of section.querySelectorAll('.reading-sentence')){
   const id=sentence.dataset.sentence;if(domWords.has(id))continue;
   const walker=document.createTreeWalker(sentence,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
   const words=[];
   for(const text of nodes){const fragment=document.createDocumentFragment();let at=0;for(const m of text.textContent.matchAll(token)){fragment.append(text.textContent.slice(at,m.index));const span=document.createElement('span');span.className='audio-word';span.textContent=m[0];fragment.append(span);words.push(span);at=m.index+m[0].length}fragment.append(text.textContent.slice(at));text.replaceWith(fragment)}
   domWords.set(id,words);sentenceNodes.set(id,sentence);
   sentence.addEventListener('click',event=>{if(event.target.closest('button,a')||!track||track.chapter!==ch||getSelection()?.toString())return;const target=track.segments.findIndex(s=>s.sentences.includes(id));if(target>=0)load(target,true)});
  }
 }
 function clear(){activeWord?.classList.remove('audio-word-active');activeWord=null;for(const s of activeSentences)s.classList.remove('audio-sentence-active');activeSentences=[];}
 function mark(){
  if(!track)return;const absolute=audio.currentTime||0;let found=track.segments.findIndex(s=>s.offset+s.duration>absolute);if(found<0)found=track.segments.length-1;index=found;const seg=track.segments[index];const t=absolute-seg.offset;
  const refs=seg.words.filter(w=>w.start!==null&&t+seg.trim_start>=w.start&&t+seg.trim_start<w.end);const ref=refs[0];
  const el=ref?domWords.get(ref.sentence)?.[ref.word]:null;
  if(el!==activeWord){activeWord?.classList.remove('audio-word-active');el?.classList.add('audio-word-active');activeWord=el}
  const ids=ref?[ref.sentence]:seg.sentences;
  const next=ids.map(id=>sentenceNodes.get(id)).filter(Boolean);
  if(next.map(s=>s.dataset.sentence).join()!==activeSentences.map(s=>s.dataset.sentence).join()){
   for(const s of activeSentences)s.classList.remove('audio-sentence-active');activeSentences=next;for(const s of next)s.classList.add('audio-sentence-active');
  }
  const current=next[0];if(follow.checked&&current&&current!==lastFollow){lastFollow=current;const box=current.getBoundingClientRect();if(box.top<100||box.bottom>innerHeight-panel.offsetHeight-30)current.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
  seek.value=String(absolute);output.textContent=`${clock(absolute)} / ${clock(track.duration)}`;if(navigator.mediaSession?.setPositionState&&track.duration>0)try{navigator.mediaSession.setPositionState({duration:track.duration,playbackRate:audio.playbackRate,position:Math.min(absolute,track.duration)})}catch{}
  const label=`${track.chapter}장 · ${index+1}/${track.segments.length} · ${seg.speaker}${seg.review_required?' · 원본 오디오 확인 필요':seg.timing_coverage<1?' · 일부 단어는 문장 강조만 적용':''}`;if(status.textContent!==label)status.textContent=label;
  if(Date.now()-saveAt>1500){saveAt=Date.now();try{localStorage.setItem(storage,JSON.stringify({chapter:track.chapter,index,time:t,rate:audio.playbackRate}))}catch{}}
 }
 function tick(){mark();if(!audio.paused)frame=requestAnimationFrame(tick)}
 function state(){playing=!audio.paused;play.textContent=playing?'❚❚ 일시정지':'▶ 듣기';play.setAttribute('aria-label',playing?'오디오북 일시정지':'오디오북 재생');if('mediaSession'in navigator){navigator.mediaSession.playbackState=playing?'playing':'paused';if(track)navigator.mediaSession.metadata=new MediaMetadata({title:`When You Trap a Tiger · Chapter ${track.chapter}`,artist:'Dramatic audiobook',artwork:[{src:new URL('assets/app-icon-512.png',location.href).href,sizes:'512x512',type:'image/png'}]})}}
 async function load(i,autoplay,time=0){
  if(!track)return;const token=++generation;audio.pause();cancelAnimationFrame(frame);clear();index=Math.max(0,Math.min(track.segments.length-1,i));retries=0;
  const seg=track.segments[index];audio.playbackRate=Number(rate.value);audio.currentTime=seg.offset+Math.min(time,Math.max(0,seg.duration-.01));
  status.textContent=`${track.chapter}장 · ${index+1}/${track.segments.length} · ${seg.speaker}${seg.timing_coverage<1?' · 일부 단어는 문장 강조만 적용':''}`;
  mark();state();if(autoplay){try{await audio.play();if(token!==generation)return;state();tick()}catch(e){if(token===generation){status.textContent='재생을 시작하려면 듣기 버튼을 눌러 주세요.';state()}}}
 }
 async function select(ch,autoplay=false){
  const request=++selection;loading=true;play.disabled=true;audio.pause();clear();
  try{const res=await fetch(`audio/ch${String(ch).padStart(2,'0')}/timing.json?v=${version}`,{cache:'no-store'});if(!res.ok)throw Error(res.status);const data=await res.json();if(request!==selection)return;track=data;audio.setTrack(track);wrap(ch);chapter.value=String(ch);seek.max=String(track.duration);await load(saved?.chapter===ch?saved.index:0,autoplay,saved?.chapter===ch?saved.time:0);saved=null;}
  catch(e){if(request===selection){track=null;status.textContent='오디오 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'}}
  finally{if(request===selection){loading=false;play.disabled=!track}}
 }
 play.addEventListener('click',async()=>{panel.classList.remove('collapsed');if(loading||!track)return;if(audio.paused){try{await audio.play();tick()}catch{status.textContent='오디오를 불러올 수 없습니다. 연결을 확인해 주세요.'}}else{audio.pause();cancelAnimationFrame(frame)}state()});
 $('.audio-prev').onclick=()=>load(index-1,true);$('.audio-next').onclick=()=>load(index+1,true);
 chapter.onchange=()=>{saved=null;select(Number(chapter.value),true)};rate.onchange=()=>{audio.playbackRate=Number(rate.value)};
 seek.oninput=()=>{if(!track)return;const t=Number(seek.value);let i=track.segments.findIndex(s=>s.offset+s.duration>t);if(i<0)i=track.segments.length-1;load(i,!audio.paused,t-track.segments[i].offset)};
 $('.audio-close').onclick=()=>{panel.classList.toggle('collapsed');$('.audio-close').textContent=panel.classList.contains('collapsed')?'⌃':'⌄'};
 audio.addEventListener('ended',()=>{cancelAnimationFrame(frame);const next=book.chapters.find(c=>c.chapter===track.chapter+1);if(next)select(next.chapter,true);else{state();clear();status.textContent=`${track.chapter}장 재생 완료. 다음 장 오디오가 있으면 장 목록에서 선택하세요.`}});
 audio.addEventListener('pause',state);audio.addEventListener('play',state);audio.addEventListener('seeked',mark);
 audio.addEventListener('error',()=>{if(retries++<2){const t=audio.currentTime;setTimeout(()=>{audio.load();audio.currentTime=t;audio.play().then(tick).catch(()=>{})},1000*retries)}else{state();status.textContent='이 구간의 오디오를 읽지 못했습니다. 듣기를 다시 눌러 주세요.'}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!audio.paused){cancelAnimationFrame(frame);tick()}});
 fetch(`audio/catalog.json?v=${version}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(async data=>{
  book=data;for(const c of data.chapters){const option=document.createElement('option');option.value=c.chapter;option.textContent=`${c.chapter}장`;chapter.append(option);const head=document.querySelector(`#chapter-${String(c.chapter).padStart(3,'0')} .chapter-head`);const b=document.createElement('button');b.type='button';b.className='chapter-listen';b.textContent='▶ 이 장 듣기';b.onclick=()=>{saved=null;panel.classList.remove('collapsed');select(c.chapter,true)};head?.append(b);if(c.source_issues?.length){const warning=document.createElement('small');warning.className='audio-unavailable';warning.textContent=`원본 오디오 ${c.source_issues.length}개 구간 확인 필요 · 재생 중 이상 구간은 다음 구간 버튼으로 이동할 수 있습니다.`;head?.append(warning)}}
  for(const sec of document.querySelectorAll('section.chapter'))if(!data.chapters.some(c=>sec.id===`chapter-${String(c.chapter).padStart(3,'0')}`)){const hint=document.createElement('small');hint.className='audio-unavailable';hint.textContent='오디오 준비 전 · 본문 읽기 가능';sec.querySelector('.chapter-head')?.append(hint)}
  if(saved?.rate)rate.value=String(saved.rate);const hash=Number(location.hash.match(/chapter-(\d+)/)?.[1]);const initial=data.chapters.some(c=>c.chapter===hash)?hash:data.chapters.some(c=>c.chapter===saved?.chapter)?saved.chapter:data.chapters[0]?.chapter;if(initial)await select(initial);else{status.textContent='아직 오디오가 없습니다.';play.disabled=true}
 }).catch(()=>{status.textContent='오디오 목록을 불러오지 못했습니다.';play.disabled=true});
})();
