const CACHE_NAME='familyquest-v5';
const ASSETS=[
 './','./index.html','./style.css','./app.js','./adventure.json','./manifest.webmanifest','./assets/icons/icon.svg',
 './assets/missions/m1-detail.png','./assets/missions/m1-wide.png',
 './assets/missions/m2-detail.png','./assets/missions/m2-wide.jpg',
 './assets/missions/m3-detail.png','./assets/missions/m3-wide.png',
 './assets/missions/m4-detail.png','./assets/missions/m4-wide.png',
 './assets/missions/m5-detail.png','./assets/missions/m5-wide.png',
 './assets/missions/m6-detail.png','./assets/missions/m6-wide.png',
 './assets/missions/m7-detail.png','./assets/missions/m7-wide.png',
 './assets/missions/m8-detail.png','./assets/missions/m8-wide.png',
 './assets/missions/m9-detail.png','./assets/missions/m9-wide.png'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{event.respondWith(fetch(event.request).then(resp=>{const copy=resp.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)).catch(()=>{});return resp}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))))});
