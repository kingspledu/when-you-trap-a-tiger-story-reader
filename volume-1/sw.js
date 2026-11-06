'use strict';
const PREFIX='story-reader-tiger-volume-1-';
const CACHE=PREFIX+'2b05595344ba';
const ROOT=new URL('./',self.location).href;
const CORE=['./','./style.css?v=2b05595344ba','./app.js?v=2b05595344ba','./pwa.js?v=2b05595344ba','./manifest.webmanifest','./assets/app-icon-192.png','./assets/app-icon-512.png'];
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
