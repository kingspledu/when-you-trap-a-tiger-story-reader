(()=>{
'use strict';const base=new URL('./',location.href),cacheName=url=>'tiger-offline:'+url.pathname+'offline-v2';
const box=document.createElement('details');box.className='offline-tools';box.style.cssText='max-width:1000px;margin:28px auto;padding:16px;border:1px solid var(--line);border-radius:12px';
box.innerHTML='<summary>↓ 오프라인 저장</summary><p>Wi-Fi에서 미리 저장하면 인터넷 없이 본문·삽화·오디오를 이용할 수 있습니다. 저장 중에는 페이지를 열어 두세요.</p><button type="button" data-scope="current">이 권 다운로드·업데이트</button> <button type="button" data-scope="all">전체 3권 한꺼번에 다운로드</button><progress max="1" value="0" style="display:block;width:100%;margin-top:12px"></progress><p role="status"></p>';
const anchor=document.querySelector('.book-intro,section.chapter');if(anchor)anchor.before(box);else document.body.append(box);
const buttons=[...box.querySelectorAll('button')],status=box.querySelector('[role=status]'),progress=box.querySelector('progress');
async function download(all){buttons.forEach(b=>b.disabled=true);let failed=false;try{
 if(!navigator.onLine)throw Error('온라인 상태에서 다운로드를 시작해 주세요.');
 if(!('serviceWorker'in navigator)||!('caches'in window))throw Error('이 브라우저는 오프라인 저장을 지원하지 않습니다.');
 await navigator.storage?.persist?.();
 const roots=all?[1,2,3].map(v=>new URL(`../volume-${v}/`,base)):[base];const plans=[];
 for(const root of roots){const response=await fetch(new URL('offline-manifest.json',root),{cache:'no-store'});if(!response.ok)throw Error('다운로드 목록을 가져오지 못했습니다.');const manifest=await response.json();plans.push({root,manifest});const registration=await navigator.serviceWorker.register(new URL('sw.js',root).href,{scope:root.pathname,updateViaCache:'none'});await registration.update();if(!registration.active)await new Promise((resolve,reject)=>{const worker=registration.installing||registration.waiting;if(!worker){reject(Error('오프라인 준비 실패'));return}worker.addEventListener('statechange',()=>{if(worker.state==='activated')resolve();if(worker.state==='redundant')reject(Error('오프라인 준비 실패'))})});}
 const totalBytes=plans.reduce((n,p)=>n+p.manifest.bytes,0),estimate=await navigator.storage?.estimate?.();
 if(estimate?.quota&&estimate.quota-(estimate.usage||0)<totalBytes*1.1)throw Error('브라우저 저장 공간이 부족합니다.');
 const jobs=[];for(const {root,manifest}of plans){const cache=await caches.open(cacheName(root));for(const file of manifest.files)jobs.push({url:new URL(file,root).href,hash:manifest.sha256[file],cache});}
 let cursor=0,done=0;progress.max=jobs.length;progress.value=0;
 async function worker(){while(!failed&&cursor<jobs.length){const job=jobs[cursor++];let existing=await job.cache.match(job.url);
  if(existing?.headers.get('X-Tiger-SHA256')!==job.hash){for(let n=0;n<3;n++){try{const response=await fetch(job.url,{cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);const body=await response.arrayBuffer();const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',body))].map(b=>b.toString(16).padStart(2,'0')).join('');if(digest!==job.hash)throw Error('서버 파일이 업데이트 중입니다. 잠시 후 다시 시도해 주세요.');const headers=new Headers(response.headers);headers.set('X-Tiger-SHA256',digest);await job.cache.put(job.url,new Response(body,{status:200,headers}));break}catch(e){if(n===2){failed=true;throw e;}await new Promise(resolve=>setTimeout(resolve,600*(n+1)))}}}
  progress.value=++done;status.textContent=`저장 중 ${done}/${jobs.length} · 약 ${Math.ceil(totalBytes/1048576)}MB`;
 }}
 const results=await Promise.allSettled([worker(),worker(),worker()]);const error=results.find(r=>r.status==='rejected');if(error)throw error.reason;
 for(const job of jobs){const saved=await job.cache.match(job.url);if(saved?.headers.get('X-Tiger-SHA256')!==job.hash)throw Error('일부 파일이 누락됐습니다. 다시 누르면 이어서 저장합니다.');}
 for(const {root,manifest}of plans)localStorage.setItem(cacheName(root),JSON.stringify({date:new Date().toISOString(),files:manifest.files.length}));
 status.textContent=`오프라인 저장 완료 · ${all?'전체 3권':'이 권'} ${done}개 파일 검증 완료. 같은 브라우저에서 페이지를 다시 열어 이용하세요.`;
}catch(e){status.textContent=`저장 중단: ${e.message} 다시 누르면 완료된 파일은 건너뜁니다.`}finally{buttons.forEach(b=>b.disabled=false)}}
buttons.forEach(b=>b.onclick=()=>download(b.dataset.scope==='all'));
try{const saved=JSON.parse(localStorage.getItem(cacheName(base))||'null');if(saved)status.textContent=`저장 이력: ${saved.files}개 · ${new Date(saved.date).toLocaleDateString()} · 새 오디오는 다운로드·업데이트를 눌러 받으세요.`}catch{}
})();
