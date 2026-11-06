(()=>{'use strict';const key='story-reader:'+document.documentElement.dataset.storyId,slider=document.getElementById('font-size'),value=document.getElementById('font-value'),minus=document.getElementById('smaller'),plus=document.getElementById('larger'),theme=document.getElementById('theme');let size=window.matchMedia('(max-width:700px)').matches?16:19,dark=false;try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(Number.isFinite(saved.size))size=Math.max(14,Math.min(50,saved.size));dark=saved.dark===true}catch{}function save(){try{localStorage.setItem(key,JSON.stringify({size,dark}))}catch{}}function render(){document.documentElement.style.setProperty('--reading',size+'pt');slider.value=size;value.value=size+'pt';value.textContent=size+'pt';minus.disabled=size<=14;plus.disabled=size>=50;document.body.classList.toggle('dark',dark);theme.setAttribute('aria-label',dark?'밝은 테마로 전환':'어두운 테마로 전환');theme.setAttribute('aria-pressed',String(dark))}slider.addEventListener('input',()=>{size=Number(slider.value);render();save()});minus.addEventListener('click',()=>{size=Math.max(14,size-2);render();save()});plus.addEventListener('click',()=>{size=Math.min(50,size+2);render();save()});theme.addEventListener('click',()=>{dark=!dark;render();save()});render();const menu=document.getElementById('chapter-menu');menu.addEventListener('click',event=>{if(event.target.closest('a[href^="#"]'))menu.open=false});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus()}});document.addEventListener('click',event=>{if(menu.open&&!menu.contains(event.target))menu.open=false})})();

(()=>{'use strict';const bar=document.getElementById('floating-reader');if(!bar)return;let frame;function measure(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>document.documentElement.style.setProperty('--reader-bar-bottom',Math.ceil(bar.getBoundingClientRect().bottom)+'px'))}if('ResizeObserver'in window)new ResizeObserver(measure).observe(bar);window.addEventListener('resize',measure,{passive:true});if(document.fonts)document.fonts.ready.then(measure);measure()})();

(()=>{const key='tiger-book-position:'+location.pathname,bar=document.createElement('div');bar.className='reading-progress';document.body.prepend(bar);const resume=document.querySelector('.resume');let last='';try{last=localStorage.getItem(key)||''}catch{}if(last&&document.getElementById(last)){resume.href='#'+last;resume.classList.add('visible')}let ticking=false;function progress(){const max=document.documentElement.scrollHeight-innerHeight;bar.style.width=(max>0?Math.min(100,100*scrollY/max):0)+'%';ticking=false}addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(progress);ticking=true}},{passive:true});addEventListener('resize',progress);progress();const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){try{localStorage.setItem(key,e.target.id)}catch{}}}},{rootMargin:'-20% 0px -65% 0px'});document.querySelectorAll('.story-text').forEach(p=>observer.observe(p));const co=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){document.querySelectorAll('.toc-links a').forEach(a=>a.setAttribute('aria-current',String(a.hash==='#'+e.target.id)));document.querySelector('.chapter-menu summary').firstChild.textContent=e.target.querySelector('h3').textContent+' ';}},{rootMargin:'-15% 0px -65% 0px'});document.querySelectorAll('section.chapter').forEach(s=>co.observe(s));})();
(()=>{
  'use strict';
  const dataNode=document.getElementById('vocabulary-data');
  if(!dataNode)return;
  const entries=JSON.parse(dataNode.textContent);
  let active=null,serial=0;
  const closing=new Map();
  const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animate(panel,from,to,onfinish){
    if(reduce()||!panel.animate){onfinish();return;}
    const animation=panel.animate([{height:from+'px',opacity:from===0?0:1},{height:to+'px',opacity:to===0?0:1}],{duration:230,easing:'cubic-bezier(.2,.7,.2,1)'});
    animation.onfinish=onfinish;
    return animation;
  }
  function close(returnFocus=false,immediate=false){
    if(!active)return;
    const current=active;active=null;
    const height=current.panel.getBoundingClientRect().height;
    current.animation?.cancel();
    current.button.setAttribute('aria-expanded','false');
    current.button.removeAttribute('aria-controls');
    current.panel.inert=true;
    if(returnFocus)current.button.focus({preventScroll:true});
    const remove=()=>{closing.delete(current.panel);current.panel.remove();};
    if(immediate)remove();else{
      closing.set(current.panel,null);
      const animation=animate(current.panel,height,0,remove);
      if(closing.has(current.panel))closing.set(current.panel,animation);
    }
  }
  function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;}
  document.addEventListener('click',event=>{
    const button=event.target.closest('.vocab-word');
    if(!button)return;
    const entry=entries[button.dataset.vocab];if(!entry)return;
    if(active?.button===button){close();return;}
    // Remove an old card before opening another to avoid cumulative layout shifts.
    close(false,true);
    for(const [panel,animation] of closing){animation?.cancel();panel.remove();}
    closing.clear();
    const sentence=button.closest('.reading-sentence');
    const panel=element('div','vocab-slide');panel.id='word-card-'+(++serial);panel.setAttribute('role','region');panel.setAttribute('aria-label',entry.word+' 뜻');panel.lang='ko';
    const card=element('div','vocab-card');
    const label=element('small','','WORD & EXPRESSION');
    const title=element('strong','',entry.word);title.lang='en';
    const meaning=element('p','vocab-meaning',entry.meaning);
    const dismiss=element('button','vocab-close','×');dismiss.type='button';dismiss.setAttribute('aria-label','단어 카드 닫기');dismiss.addEventListener('click',()=>close(true));
    card.append(label,title,meaning,dismiss);
    if(entry.sentenceMeaning)card.append(element('p','vocab-context',entry.sentenceMeaning));
    panel.append(card);sentence.after(panel);
    button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls',panel.id);
    const current={button,panel,animation:null};active=current;
    current.animation=animate(panel,0,panel.scrollHeight,()=>{current.animation=null;});
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active){event.preventDefault();close(true);}});
})();
