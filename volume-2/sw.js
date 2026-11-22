'use strict';
const ROOT=new URL('./',self.location).href;
const PREFIX='story-reader-tiger-volume-2-';
const CORE=PREFIX+'landscape-20261122-v1';
const SAVED='tiger-offline:'+new URL(ROOT).pathname+'offline-v2';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CORE).then(c=>c.addAll(['./','./style.css','./app.js','./pwa.js','./clip-player.js','./media-player.js','./audiobook.js','./audiobook.css','./offline.js','./landscape-reader.js','./landscape-reader.css'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CORE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
const request=event.request,url=new URL(request.url);
if(request.method!=='GET'||!url.href.startsWith(ROOT))return;
event.respondWith((async()=>{
 const cache=await caches.open(SAVED);const saved=()=>cache.match(request,{ignoreSearch:true});
 if(request.headers.has('range')){const full=await saved();if(full){const data=await full.arrayBuffer(),range=request.headers.get('range').match(/^bytes=(\d*)-(\d*)$/);if(!range)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+data.byteLength}});let start=range[1]?Number(range[1]):Math.max(0,data.byteLength-Number(range[2])),end=range[1]?(range[2]?Math.min(Number(range[2]),data.byteLength-1):data.byteLength-1):data.byteLength-1;if(start>end||start>=data.byteLength)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+data.byteLength}});return new Response(data.slice(start,end+1),{status:206,headers:{'Content-Type':full.headers.get('Content-Type')||'audio/mpeg','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${data.byteLength}`,'Content-Length':String(end-start+1)}});}return fetch(request);}
 if(request.cache!=='no-store'&&(url.pathname.endsWith('.mp3')||url.pathname.includes('/assets/'))){const existing=await saved();if(existing)return existing;}
 try{const response=await fetch(request);if(response.ok)return response;return await saved()||response;}
 catch{const core=await caches.open(CORE);return await core.match(request,{ignoreSearch:true})||await saved()||Response.error();}
})());
});
