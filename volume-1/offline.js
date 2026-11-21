(()=>{
const version='offline-v1',scope=new URL('./',location.href).pathname,cacheName='tiger-offline:'+scope+version;
const box=document.createElement('details');box.className='offline-tools';box.style.cssText='max-width:1000px;margin:28px auto;padding:16px;border:1px solid var(--line);border-radius:12px';box.innerHTML='<summary>↓ 오프라인 저장</summary><p>이 권의 본문·삽화·준비된 모든 오디오를 저장합니다. Wi-Fi 연결 상태를 확인해 주세요.</p><button type="button">이 권 전체 다운로드</button><progress max="1" value="0"></progress><p role="status"></p>';const anchor=document.querySelector('.book-intro,section.chapter');if(anchor)anchor.before(box);else document.body.append(box);
const button=box.querySelector('button'),status=box.querySelector('[role=status]'),progress=box.querySelector('progress');
button.onclick=async()=>{button.disabled=true;try{
if(!navigator.onLine)throw Error('온라인 상태에서 다운로드를 시작해 주세요.');
await navigator.serviceWorker.ready;await navigator.storage?.persist?.();
const r=await fetch('offline-manifest.json',{cache:'no-store'});if(!r.ok)throw Error('다운로드 목록을 가져오지 못했습니다.');const manifest=await r.json();
const estimate=await navigator.storage?.estimate?.();if(estimate?.quota&&estimate.quota-(estimate.usage||0)<manifest.bytes*1.1)throw Error('브라우저 저장 공간이 부족합니다.');
const cache=await caches.open(cacheName);let done=0,cursor=0;progress.max=manifest.files.length;
async function worker(){while(cursor<manifest.files.length){const file=manifest.files[cursor++],url=new URL(file,location.href).href;
if(!await cache.match(url)){let response;for(let n=0;n<3;n++){try{response=await fetch(url);if(!response.ok)throw Error(`${response.status}`);await cache.put(url,response);break}catch(e){if(n===2)throw e;}}}
progress.value=++done;status.textContent=`저장 중 ${done}/${manifest.files.length} · 약 ${Math.ceil(manifest.bytes/1048576)}MB`;}}
await Promise.all([worker(),worker(),worker()]);
for(const file of manifest.files)if(!await cache.match(new URL(file,location.href).href))throw Error('일부 리소스가 누락됐습니다. 다시 누르면 이어서 저장합니다.');
localStorage.setItem(cacheName,JSON.stringify({date:new Date().toISOString(),files:done}));status.textContent=`오프라인 저장 완료 · ${done}개 파일. 이 페이지를 같은 브라우저에서 다시 열어 주세요.`;
}catch(e){status.textContent=`저장 중단: ${e.message} 다시 누르면 저장된 파일부터 이어갑니다.`}finally{button.disabled=false}};
try{const saved=JSON.parse(localStorage.getItem(cacheName)||'null');if(saved)status.textContent=`저장 이력: ${saved.files}개 · ${new Date(saved.date).toLocaleDateString()} (브라우저가 저장 공간을 정리하면 다시 다운로드가 필요합니다.)`}catch{}
})();
