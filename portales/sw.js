// Portales GPS Tenerife: app shell disponible sin conexión.
// NO descargar ni precargar teselas de los servidores tile.openstreetmap.org.
const CACHE="portales-gps-shell-v1";
const SHELL=["./","./index.html","./manifest.webmanifest"];
const LIBS=[
 "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
 "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
];
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(SHELL);
  await Promise.allSettled(LIBS.map(async url=>{
   const res=await fetch(url,{mode:"no-cors"});
   await cache.put(url,res);
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith("portales-gps-shell-")&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);
 // Respect OSM Foundation policy: no bulk tile download or offline prefetch.
 if(url.hostname==="tile.openstreetmap.org" || url.hostname==="api-features.idee.es" || url.hostname==="nominatim.openstreetmap.org")return;
 const local=url.origin===self.location.origin&&url.pathname.startsWith(new URL("./",self.registration.scope).pathname);
 const external=LIBS.includes(url.href);
 if(!local&&!external)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  let cached=await cache.match(event.request);
  if(cached)return cached;
  try{
   let res=await fetch(event.request);
   if(res.ok||res.type==="opaque")await cache.put(event.request,res.clone());
   return res;
  }catch(e){
   if(event.request.mode==="navigate")return await cache.match("./index.html");
   throw e;
  }
 })());
});
