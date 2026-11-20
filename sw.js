// Update this cache name whenever frontend assets change.
const CACHE = 'truckledger-shell-v27';
const SHELL = ['./', './index.html', './style.css', './style.css?v=27', './app.js', './cloud.js', './audit_pdf.js', './finances.js', './auto_personal.js', './auto_personal.js?v=18', './audit_pdf.js?v=20', './trend.js', './trend.js?v=16', './motion.js', './motion.js?v=26', './app.js?v=26', './polish.js', './polish.js?v=23', './tutorial.js', './tutorial.js?v=24', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
 './icon.svg?v=24', './icon-192.png?v=24', './icon-512.png?v=24',
 './apple-touch-icon.png?v=24', './manifest.webmanifest?v=24',
 './splash-logo.mp4', './splash-logo.mp4?v=27', './splash-logo-poster.webp', './splash-logo-poster.webp?v=27', './splash.js', './splash.js?v=27'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('truckledger-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  // Safari often asks for MP4 content with HTTP Range headers, even when offline.
  // Return the correct partial bytes from the precached optimized video.
  if(new URL(event.request.url).pathname.endsWith('/splash-logo.mp4')&&
      event.request.headers.has('range')){
    event.respondWith((async()=>{
      const cached=await caches.match(event.request.url);
      if(!cached)return fetch(event.request);
      const bytes=await cached.arrayBuffer(),size=bytes.byteLength;
      const match=/^bytes=(\d*)-(\d*)$/i.exec(event.request.headers.get('range')||'');
      if(!match||(!match[1]&&!match[2]))return fetch(event.request);
      let first,last;
      if(match[1]){first=Number(match[1]);last=match[2]?Number(match[2]):size-1;}
      else{const suffix=Number(match[2]);first=Math.max(0,size-suffix);last=size-1;}
      if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||
          first<0||first>=size||last<first)return fetch(event.request);
      last=Math.min(last,size-1);
      return new Response(bytes.slice(first,last+1),{status:206,headers:{
        'Content-Type':'video/mp4',
        'Content-Length':String(last-first+1),
        'Content-Range':'bytes '+first+'-'+last+'/'+size,
        'Accept-Ranges':'bytes',
        'Cache-Control':'no-store'
      }});
    })());
    return;
  }
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
