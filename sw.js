const CACHE = "musikku-pro-v5";
const FILES = ["./","./index.html","./script.js","./style.css","./manifest.json","./icon-512.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener("fetch", e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
