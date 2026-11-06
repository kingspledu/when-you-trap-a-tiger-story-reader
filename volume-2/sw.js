'use strict';
const PREFIX='story-reader-tiger-volume-2-';
const CACHE=PREFIX+'4dc7a6a8562b';
const ROOT=new URL('./',self.location).href;
const CORE=['./','./style.css?v=4dc7a6a8562b','./app.js?v=4dc7a6a8562b','./pwa.js?v=4dc7a6a8562b','./manifest.webmanifest','./assets/app-icon-192.png','./assets/app-icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||!url.href.startsWith(ROOT))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(ROOT,response.clone())}return response}).catch(async()=>{const cache=await caches.open(CACHE);return await cache.match(ROOT)||Response.error()}));return;
 }
 event.respondWith(fetch(request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}return response}).catch(async()=>await caches.match(request)||Response.error()));
});
