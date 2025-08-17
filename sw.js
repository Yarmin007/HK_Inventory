 const VERSION = '2025-08-17-2';
  const CACHE = 'hk-inventory-cache-' + VERSION;
  const ASSETS = [ './', './index.html' ];

  self.addEventListener('install', e=>{
    e.waitUntil(
      caches.open(CACHE)
        .then(c=>c.addAll(ASSETS))
        .then(()=> self.skipWaiting())
    );
  });

  self.addEventListener('activate', e=>{
    e.waitUntil((async ()=>{
      const names = await caches.keys();
      await Promise.all(names.filter(n => n!==CACHE).map(n=>caches.delete(n)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true});
      for (const client of clients){
        client.postMessage({type:'SW_ACTIVATED', version: VERSION});
      }
    })());
  });

  self.addEventListener('message', e=>{
    if(e.data && e.data.type==='SKIP_WAITING') self.skipWaiting();
  });

  self.addEventListener('fetch', e=>{
    const req = e.request;
    // Network-first for navigations (HTML) so new deploys show immediately
    if (req.mode === 'navigate' || req.destination === 'document'){
      e.respondWith((async ()=>{
        try {
          const res = await fetch(req);
          const clone = res.clone();
          const c = await caches.open(CACHE); await c.put('./', clone);
          return res;
        } catch(err){
          return (await caches.match('./')) || (await caches.match('index.html')) || Response.error();
        }
      })());
      return;
    }
    // Cache-first for everything else
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res=>{
        if(req.method==='GET' && res.ok){
          const clone = res.clone(); caches.open(CACHE).then(c=>c.put(req, clone));
        }
        return res;
      }))
    );
  });
