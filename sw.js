const CACHE='ethan-office-v17-ai-removed-audited';
const CORE=['./','./index.html','./manifest.webmanifest','./assets/style.css','./assets/app.js','./assets/icon-96.png','./assets/icon-192.png','./assets/icon-512.png','./assets/ethan-office-brand.jpg','./document-utility.html','./assets/ethan-documents-logo.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url);
 if(e.request.mode==='navigate'){
  const fallback=url.pathname.endsWith('/document-utility.html')||url.pathname.endsWith('document-utility.html')?'./document-utility.html':'./index.html';
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(fallback,copy));return r}).catch(()=>caches.match(fallback)));return;
 }
 if(url.origin===self.location.origin)e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r})));
});
