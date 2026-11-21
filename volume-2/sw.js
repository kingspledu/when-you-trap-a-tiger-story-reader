'use strict';
const ROOT=new URL('./',self.location).href;
const PREFIX='story-reader-tiger-volume-2-';
const CORE=PREFIX+'offline-v2';
const SAVED='tiger-offline:'+new URL(ROOT).pathname+'offline-v2';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CORE).then(c=>c.addAll(['./','./style.css','./app.js','./pwa.js','./clip-player.js','./audiobook.js','./audiobook.css','./offline.js'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CORE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
const request=event.request,url=new URL(request.url);
if(request.method!=='GET'||!url.href.startsWith(ROOT)||request.headers.has('range'))return;
event.respondWith((async()=>{
 const cache=await caches.open(SAVED);const saved=()=>cache.match(request,{ignoreSearch:true});
 if(request.cache!=='no-store'&&(url.pathname.endsWith('.mp3')||url.pathname.includes('/assets/'))){const existing=await saved();if(existing)return existing;}
 try{const response=await fetch(request);if(response.ok)return response;return await saved()||response;}
 catch{return await saved()||await caches.match(request,{ignoreSearch:true})||Response.error();}
})());
});
