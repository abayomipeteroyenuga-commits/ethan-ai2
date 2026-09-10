const CACHE='ethan-ai-v7.7.0-stable-pwa';
const CORE=['/','/index.html','/style.css','/app.js','/config.js','/ethan-ai-logo.png','/icon-192.png','/icon-512.png','/manifest.webmanifest'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{try{const fresh=await fetch(req);const c=await caches.open(CACHE);c.put('/',fresh.clone()).catch(()=>{});return fresh;}catch{return (await caches.match('/'))||Response.error();}})());return;
  }
  event.respondWith((async()=>{const cached=await caches.match(req);if(cached){event.waitUntil(fetch(req).then(async fresh=>{if(fresh.ok)(await caches.open(CACHE)).put(req,fresh.clone());}).catch(()=>{}));return cached;}try{const fresh=await fetch(req);if(fresh.ok)(await caches.open(CACHE)).put(req,fresh.clone()).catch(()=>{});return fresh;}catch{return Response.error();}})());
});
