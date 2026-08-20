/* =========================================================
   MYMUSIC — SERVICE WORKER
   SAFE CACHE
   ---------------------------------------------------------
   - PWA tetap bisa offline
   - File aplikasi tetap dicache
   - Request Cobalt / audio eksternal tidak dipaksa masuk cache
   - Fetch error tidak membuat respondWith gagal
   - Tidak mengganggu IndexedDB
========================================================= */

const CACHE = "musikku-pro-v5";

const FILES = [
  "./",
  "./index.html",
  "./script.js",
  "./style.css",
  "./manifest.json",
  "./icon-512.png"
];


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(CACHE)
        .then(
          cache =>
            cache.addAll(FILES)
        )

    );


    self.skipWaiting();

  }
);


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()
        .then(
          keys =>

            Promise.all(

              keys
                .filter(
                  key =>
                    key !== CACHE
                )
                .map(
                  key =>
                    caches.delete(key)
                )

            )

        )

    );


    self.clients.claim();

  }
);


/* =========================================================
   FETCH
========================================================= */

self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;


    /*
       Hanya tangani GET.
    */

    if(
      request.method !==
      "GET"
    ){

      return;

    }


    const url =
      new URL(
        request.url
      );


    /*
       Request dari origin MyMusic
       boleh menggunakan cache.
    */

    if(
      url.origin ===
      self.location.origin
    ){

      event.respondWith(

        caches
          .match(request)
          .then(
            cached => {

              if(cached){

                return cached;

              }


              return fetch(request)
                .catch(
                  () =>
                    new Response(
                      "",
                      {
                        status:
                          503,

                        statusText:
                          "Offline"
                      }
                    )
                );

            }
          )

      );


      return;

    }


    /*
       Request eksternal:
       YouTube / Google / Cobalt / CDN / audio.
       
       Jangan dimasukkan ke cache PWA.
       
       Biarkan browser mengambil langsung.
    */

    event.respondWith(

      fetch(request)
        .catch(
          () =>

            new Response(
              "",
              {
                status:
                  503,

                statusText:
                  "Network unavailable"
              }
            )

        )

    );

  }
);
