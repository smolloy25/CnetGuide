const CACHE='vertage-cnet-v6';
const SHELL=['./','./index.html','./app.js','./guide-data.js','./guide-utils.js','./video-data.js','./styles.css','./manifest.webmanifest','./assets/vertage-logo.svg','./assets/hero-vertage.webp','./assets/hero-vertage.webm','./assets/hero-vertage.mp4','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png',...['01','02','03a','03b','04','05','06','07','08','09','10','11'].map(id=>`./assets/process-${id}.webp`)];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('vertage-cnet-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{if(response.status===200){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(async()=>{const cached=await caches.match(event.request);if(cached)return cached;if(event.request.mode==='navigate')return caches.match('./index.html');return Response.error();}));
});
