// Update this cache name whenever frontend assets change.
const CACHE = 'truckledger-shell-v26';
const SHELL = ['./', './index.html', './style.css', './style.css?v=26', './app.js', './cloud.js', './audit_pdf.js', './finances.js', './auto_personal.js', './auto_personal.js?v=18', './audit_pdf.js?v=20', './trend.js', './trend.js?v=16', './motion.js', './motion.js?v=26', './app.js?v=26', './polish.js', './polish.js?v=23', './tutorial.js', './tutorial.js?v=24', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
 './icon.svg?v=24', './icon-192.png?v=24', './icon-512.png?v=24',
 './apple-touch-icon.png?v=24', './manifest.webmanifest?v=24',
 './splash.webp', './splash.webp?v=24', './splash.js', './splash.js?v=25'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('truckledger-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  // A network-first strategy for app code prevents mixed cached versions
  // (e.g. an updated app.js with an old/missing motion.js) after deployment.
  // Previously installed files remain fully available when offline.
  if(event.request.mode==='navigate'||event.request.destination==='script'||event.request.destination==='style'){
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>cached||Response.error())));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
    return response;
  })));
});
