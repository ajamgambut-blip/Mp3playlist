/* =========================================================
   MYMUSIC V2 — APP.JS
   PREMIUM VINYL + SAFE VISUALIZER

   LOCAL MUSIC
   YOUTUBE
   INDEXEDDB
   MEDIA SESSION
   LOCK SCREEN PLAYBACK

   IMPORTANT
   ---------------------------------------------------------
   - Native HTMLAudioElement
   - No AudioContext
   - No createMediaElementSource()
   - No AnalyserNode
   - Local playback remains background-safe
========================================================= */


const YOUTUBE_API_KEY =
  "AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c";


/* =========================================================
   ELEMENT HELPER
========================================================= */

const $ = id =>
  document.getElementById(id);


const audio =
  $("audio");


const playlist =
  $("playlist");


/* =========================================================
   GLOBAL STATE
========================================================= */

let songs = [];

let current = -1;

let yt = null;

let ytReady = false;

let pending = null;

let shuffle = false;

let repeat = false;

let url = null;

let ytTimer = null;


/* =========================================================
   DATABASE
========================================================= */

const DB =
  "MyMusicDB";

const VERSION =
  2;

let db;


/* =========================================================
   OPEN DATABASE
========================================================= */

function openDB(){

  return new Promise(
    (resolve,reject)=>{

      const request =
        indexedDB.open(
          DB,
          VERSION
        );


      request.onupgradeneeded =
        event => {

          const database =
            event.target.result;


          if(
            !database.objectStoreNames
              .contains("songs")
          ){

            database.createObjectStore(
              "songs",
              {
                keyPath:"id"
              }
            );

          }


          if(
            !database.objectStoreNames
              .contains("searchCache")
          ){

            database.createObjectStore(
              "searchCache",
              {
                keyPath:"key"
              }
            );

          }

        };


      request.onsuccess =
        event => {

          db =
            event.target.result;


          resolve();

        };


      request.onerror =
        () => {

          reject(
            request.error
          );

        };

    }
  );

}


/* =========================================================
   GET SONGS
========================================================= */

function getSongs(){

  return new Promise(
    resolve => {

      const request =
        db
          .transaction(
            "songs"
          )
          .objectStore(
            "songs"
          )
          .getAll();


      request.onsuccess =
        () => {

          resolve(
            request.result || []
          );

        };


      request.onerror =
        () => {

          resolve([]);

        };

    }
  );

}


/* =========================================================
   SAVE SONG
========================================================= */

function saveSong(song){

  return new Promise(
    (resolve,reject)=>{

      const transaction =
        db.transaction(
          "songs",
          "readwrite"
        );


      transaction
        .objectStore("songs")
        .put(song);


      transaction.oncomplete =
        () => {

          resolve();

        };


      transaction.onerror =
        () => {

          reject(
            transaction.error
          );

        };

    }
  );

}


/* =========================================================
   REMOVE SONG
========================================================= */

function removeSong(id){

  return new Promise(
    (resolve,reject)=>{

      const transaction =
        db.transaction(
          "songs",
          "readwrite"
        );


      transaction
        .objectStore("songs")
        .delete(id);


      transaction.oncomplete =
        () => {

          resolve();

        };


      transaction.onerror =
        () => {

          reject(
            transaction.error
          );

        };

    }
  );

}


/* =========================================================
   TIME FORMAT
========================================================= */

function time(seconds){

  if(
    !isFinite(seconds) ||
    seconds < 0
  ){

    return "0:00";

  }


  return (
    Math.floor(
      seconds / 60
    )
    +
    ":"
    +
    String(
      Math.floor(
        seconds % 60
      )
    ).padStart(2,"0")
  );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function esc(value){

  return String(
    value || ""
  )
  .replace(
    /[&<>"']/g,
    m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[m])
  );

}


/* =========================================================
   VINYL
========================================================= */

let vinyl = null;

let vinylCenter = null;

let canvas = null;

let ctx = null;


/* =========================================================
   INIT VINYL
========================================================= */

function initVinyl(){

  if(vinyl)
    return;


  const cover =
    $("cover");


  if(!cover)
    return;


  cover.insertAdjacentHTML(
    "beforebegin",
    `

      <div id="vinylWrap">

        <div
          class="vinyl"
          id="vinyl"
        >

          <div id="vinylCenter">
            ♪
          </div>

        </div>

      </div>

      <canvas id="viz"></canvas>

    `
  );


  vinyl =
    $("vinyl");


  vinylCenter =
    $("vinylCenter");


  canvas =
    $("viz");


  if(canvas){

    ctx =
      canvas.getContext("2d");


    resizeVisualizer();


    window.addEventListener(
      "resize",
      resizeVisualizer
    );


    drawVisualizer();

  }

}


/* =========================================================
   VINYL COVER
========================================================= */

function updateVinylCover(song){

  if(!vinylCenter)
    return;


  if(
    song &&
    song.thumb
  ){

    vinylCenter.innerHTML = `

      <img
        src="${esc(song.thumb)}"
        alt=""
      >

    `;

    return;

  }


  const cover =
    $("cover");


  const img =
    cover?.querySelector("img");


  if(
    img &&
    img.src
  ){

    vinylCenter.innerHTML = `

      <img
        src="${esc(img.src)}"
        alt=""
      >

    `;

  }else{

    vinylCenter.innerHTML =
      "♪";

  }

}


/* =========================================================
   VINYL PLAY
========================================================= */

function vinylPlay(){

  if(vinyl){

    vinyl.classList.add(
      "playing"
    );

  }

}


/* =========================================================
   VINYL PAUSE
========================================================= */

function vinylPause(){

  if(vinyl){

    vinyl.classList.remove(
      "playing"
    );

  }

}


/* =========================================================
   SAFE VISUALIZER
========================================================= */

let visualizerFrame =
  null;


function resizeVisualizer(){

  if(
    !canvas ||
    !ctx
  )
    return;


  const rect =
    canvas.getBoundingClientRect();


  const dpr =
    window.devicePixelRatio || 1;


  canvas.width =
    rect.width * dpr;


  canvas.height =
    rect.height * dpr;


  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

}


/* =========================================================
   DRAW VISUALIZER
========================================================= */

function drawVisualizer(){

  if(!canvas || !ctx)
    return;


  visualizerFrame =
    requestAnimationFrame(
      drawVisualizer
    );


  if(
    document.visibilityState !==
    "visible"
  ){

    return;

  }


  const width =
    canvas.clientWidth;


  const height =
    canvas.clientHeight;


  if(
    !width ||
    !height
  )
    return;


  ctx.clearRect(
    0,
    0,
    width,
    height
  );


  ctx.fillStyle =
    "#0b0b0b";


  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  const playing =
    !audio.paused &&
    audio.readyState >= 2;


  const bars =
    52;


  const barWidth =
    width / bars;


  const now =
    Date.now() / 180;


  for(
    let i = 0;
    i < bars;
    i++
  ){

    let h;


    if(playing){

      const wave =
        Math.abs(
          Math.sin(
            i * .72 +
            now * .055
          )
        );


      const wave2 =
        Math.abs(
          Math.sin(
            i * .31 +
            now * .025
          )
        );


      h =
        3 +
        (
          wave * .55 +
          wave2 * .45
        ) *
        height *
        .35;

    }else{

      h =
        2 +
        Math.abs(
          Math.sin(
            i * .65 +
            Date.now() / 1500
          )
        ) * 3;

    }


    const x =
      i * barWidth;


    const y =
      height - h;


    ctx.fillStyle =
      playing
      ?
      "#ddd"
      :
      "rgba(255,255,255,.15)";


    ctx.beginPath();


    if(ctx.roundRect){

      ctx.roundRect(
        x,
        y,
        Math.max(
          1,
          barWidth - 2
        ),
        h,
        3
      );

    }else{

      ctx.rect(
        x,
        y,
        Math.max(
          1,
          barWidth - 2
        ),
        h
      );

    }


    ctx.fill();

  }

}


/* =========================================================
   MEDIA SESSION
   LOCK SCREEN
========================================================= */

function setupMediaSession(){

  if(
    !("mediaSession" in navigator)
  ){

    return;

  }


  /* -------------------------------------------------------
     PLAY
  ------------------------------------------------------- */

  try{

    navigator.mediaSession.setActionHandler(
      "play",
      async () => {

        if(
          current < 0 ||
          !songs[current]
        ){

          return;

        }


        const song =
          songs[current];


        if(
          song.type !== "local"
        ){

          return;

        }


        try{

          await audio.play();


          setMediaState(
            "playing"
          );


          updatePositionState();

        }catch(error){

          console.warn(
            "Lock Screen Play gagal:",
            error
          );

        }

      }
    );

  }catch(error){

    console.warn(
      "Media Session play:",
      error
    );

  }


  /* -------------------------------------------------------
     PAUSE
  ------------------------------------------------------- */

  try{

    navigator.mediaSession.setActionHandler(
      "pause",
      () => {

        if(
          songs[current]?.type !==
          "local"
        ){

          return;

        }


        audio.pause();


        setMediaState(
          "paused"
        );

      }
    );

  }catch(error){}


  /* -------------------------------------------------------
     NEXT
  ------------------------------------------------------- */

  try{

    navigator.mediaSession.setActionHandler(
      "nexttrack",
      () => {

        if(
          songs[current]?.type !==
          "local"
        ){

          return;

        }


        mediaNextSong();

      }
    );

  }catch(error){}


  /* -------------------------------------------------------
     PREVIOUS
  ------------------------------------------------------- */

  try{

    navigator.mediaSession.setActionHandler(
      "previoustrack",
      () => {

        if(
          songs[current]?.type !==
          "local"
        ){

          return;

        }


        mediaPreviousSong();

      }
    );

  }catch(error){}


  /* -------------------------------------------------------
     REMOVE ±10 SECOND BUTTONS
  ------------------------------------------------------- */

  try{

    navigator.mediaSession.setActionHandler(
      "seekbackward",
      null
    );

  }catch(error){}


  try{

    navigator.mediaSession.setActionHandler(
      "seekforward",
      null
    );

  }catch(error){}


  /* -------------------------------------------------------
     OPTIONAL SEEK FROM LOCK SCREEN
     If supported by iOS, this is a seek bar action,
     not the ±10 sec buttons.
  ------------------------------------------------------- */

  try{

    navigator.mediaSession.setActionHandler(
      "seekto",
      details => {

        if(
          songs[current]?.type !==
          "local"
        ){

          return;

        }


        if(
          !isFinite(
            details.seekTime
          )
        ){

          return;

        }


        try{

          audio.currentTime =
            details.seekTime;

        }catch(error){}

      }
    );

  }catch(error){}

}


/* =========================================================
   MEDIA NEXT
   LOCK SCREEN VERSION
========================================================= */

function mediaNextSong(){

  if(!songs.length)
    return;


  let index;


  if(shuffle){

    if(
      songs.length === 1
    ){

      index =
        current;

    }else{

      do{

        index =
          Math.floor(
            Math.random() *
            songs.length
          );

      }while(
        index === current
      );

    }

  }else{

    index =
      current + 1;


    if(
      index >= songs.length
    ){

      if(repeat){

        index =
          0;

      }else{

        return;

      }

    }

  }


  playSong(
    index
  );

}


/* =========================================================
   MEDIA PREVIOUS
   LOCK SCREEN VERSION
========================================================= */

function mediaPreviousSong(){

  if(!songs.length)
    return;


  let index =
    current - 1;


  if(index < 0){

    index =
      songs.length - 1;

  }


  /*
     LOCK SCREEN PREVIOUS:
     selalu pindah ke lagu sebelumnya.
  */

  playSong(
    index
  );

}


/* =========================================================
   MEDIA METADATA
========================================================= */

function updateMediaSession(song){

  if(
    !("mediaSession" in navigator)
  )
    return;


  try{

    if(!song){

      navigator.mediaSession.metadata =
        null;


      navigator.mediaSession.playbackState =
        "none";


      return;

    }


    const artwork =
      song.thumb
      ?
      [
        {
          src:
            song.thumb,

          sizes:
            "512x512",

          type:
            "image/jpeg"
        }
      ]
      :
      [];


    navigator.mediaSession.metadata =
      new MediaMetadata({

        title:
          song.title ||
          "Unknown",

        artist:
          song.artist ||
          "MyMusic",

        album:
          "MyMusic",

        artwork:
          artwork

      });

  }catch(error){

    console.warn(
      "Media Metadata:",
      error
    );

  }

}


/* =========================================================
   MEDIA PLAYBACK STATE
========================================================= */

function setMediaState(state){

  if(
    !("mediaSession" in navigator)
  )
    return;


  try{

    navigator.mediaSession.playbackState =
      state;

  }catch(error){}

}


/* =========================================================
   MEDIA POSITION STATE
========================================================= */

function updatePositionState(){

  if(
    !("mediaSession" in navigator)
  )
    return;


  if(
    !audio.duration ||
    !isFinite(audio.duration)
  )
    return;


  if(
    !isFinite(audio.currentTime)
  )
    return;


  try{

    navigator.mediaSession.setPositionState({

      duration:
        audio.duration,

      playbackRate:
        audio.playbackRate || 1,

      position:
        Math.min(
          audio.currentTime,
          audio.duration
        )

    });

  }catch(error){}

}


/* =========================================================
   RENDER LIBRARY
========================================================= */

function render(){

  if(!playlist)
    return;


  playlist.innerHTML =
    "";


  if($("count")){

    $("count").textContent =
      songs.length +
      " lagu";

  }


  if(!songs.length){

    playlist.innerHTML =
      '<div class="empty">Belum ada musik</div>';


    return;

  }


  songs.forEach(
    (song,index)=>{

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "song" +
        (
          index === current
          ?
          " current"
          :
          ""
        );


      item.innerHTML = `

        <div class="sc">

          ${
            song.thumb
            ?
            `<img
              src="${esc(song.thumb)}"
              alt=""
            >`
            :
            "♪"
          }

        </div>


        <div class="si">

          <b>
            ${esc(song.title)}
          </b>


          <small>

            ${
              song.type === "yt"
              ?
              "▶ YouTube"
              :
              "📁 Lokal"
            }

            ·

            ${esc(song.artist)}

            ${
              song.duration
              ?
              " · " +
              time(song.duration)
              :
              ""
            }

          </small>

        </div>


        <button class="del">
          ×
        </button>

      `;


      item.onclick =
        event => {

          if(
            event.target.closest(
              ".del"
            )
          ){

            return;

          }


          playSong(
            index
          );

        };


      const deleteButton =
        item.querySelector(
          ".del"
        );


      if(deleteButton){

        deleteButton.onclick =
          async event => {

            event.stopPropagation();


            if(
              current >= 0 &&
              songs[current]?.id ===
              song.id
            ){

              audio.pause();

              stopYT();

              vinylPause();

            }


            await removeSong(
              song.id
            );


            songs =
              await getSongs();


            if(
              current >= songs.length
            ){

              current =
                songs.length - 1;

            }


            render();

          };

      }


      playlist.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   PLAY SONG
========================================================= */

function playSong(index){

  if(!songs[index])
    return;


  current =
    index;


  const song =
    songs[index];


  render();


  if($("title")){

    $("title").textContent =
      song.title;

  }


  if($("artist")){

    $("artist").textContent =
      song.artist;

  }


  updateVinylCover(
    song
  );


  updateMediaSession(
    song
  );


  /* =======================================================
     YOUTUBE
  ======================================================= */

  if(
    song.type === "yt"
  ){

    audio.pause();

    playYT(
      song
    );

    return;

  }


  /* =======================================================
     LOCAL
  ======================================================= */

  stopYT();


  vinylPause();


  /*
     Release previous Blob URL.
  */

  if(url){

    try{

      URL.revokeObjectURL(
        url
      );

    }catch(error){}


    url =
      null;

  }


  if(!song.blob){

    $("status").textContent =
      "File tidak tersedia";


    return;

  }


  /*
     Native Blob URL.
  */

  url =
    URL.createObjectURL(
      song.blob
    );


  /*
     IMPORTANT:
     Native HTMLAudioElement only.
  */

  audio.pause();


  audio.src =
    url;


  audio.preload =
    "auto";


  audio.load();


  if($("cover")){

    $("cover").innerHTML =
      "♪";

  }


  if($("status")){

    $("status").textContent =
      "Local Music";

  }


  if($("bar")){

    $("bar").value =
      0;

  }


  if($("cur")){

    $("cur").textContent =
      "0:00";

  }


  if($("dur")){

    $("dur").textContent =
      song.duration
      ?
      time(song.duration)
      :
      "0:00";

  }


  /*
     Start native playback.
  */

  const promise =
    audio.play();


  if(promise){

    promise.catch(
      error => {

        console.warn(
          "Local playback gagal:",
          error
        );

      }
    );

  }

}


/* =========================================================
   AUDIO LOADED METADATA
========================================================= */

audio.addEventListener(
  "loadedmetadata",
  () => {

    if(
      isFinite(
        audio.duration
      )
    ){

      if($("dur")){

        $("dur").textContent =
          time(
            audio.duration
          );

      }


      if(
        current >= 0 &&
        songs[current]
      ){

        songs[current].duration =
          audio.duration;


        saveSong(
          songs[current]
        ).catch(()=>{});

      }


      updatePositionState();

    }

  }
);


/* =========================================================
   AUDIO TIME UPDATE
========================================================= */

audio.addEventListener(
  "timeupdate",
  () => {

    if(
      !audio.duration
    ){

      return;

    }


    if($("bar")){

      $("bar").value =
        (
          audio.currentTime /
          audio.duration
        ) * 100;

    }


    if($("cur")){

      $("cur").textContent =
        time(
          audio.currentTime
        );

    }


    updatePositionState();

  }
);


/* =========================================================
   AUDIO PLAY
========================================================= */

audio.addEventListener(
  "play",
  () => {

    if($("play")){

      $("play").textContent =
        "⏸";

    }


    vinylPlay();


    setMediaState(
      "playing"
    );


    updatePositionState();

  }
);


/* =========================================================
   AUDIO PAUSE
========================================================= */

audio.addEventListener(
  "pause",
  () => {

    if($("play")){

      $("play").textContent =
        "▶";

    }


    vinylPause();


    setMediaState(
      "paused"
    );


    updatePositionState();

  }
);


/* =========================================================
   AUDIO ENDED
========================================================= */

audio.addEventListener(
  "ended",
  () => {

    vinylPause();


    setMediaState(
      "none"
    );


    nextSong();

  }
);


/* =========================================================
   AUDIO ERROR
========================================================= */

audio.addEventListener(
  "error",
  () => {

    console.warn(
      "Audio error:",
      audio.error
    );


    if($("status")){

      $("status").textContent =
        "Audio Error";

    }

  }
);


/* =========================================================
   VISIBILITY CHANGE
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    /*
       VERY IMPORTANT:

       Jangan pause audio.
       Jangan load audio.
       Jangan reset src.

       Lock Screen/background playback
       tidak boleh disentuh.
    */

    if(
      document.visibilityState ===
      "visible"
    ){

      render();


      /*
         Jangan memaksa audio.play().
      */

      if(
        !audio.paused
      ){

        setMediaState(
          "playing"
        );

      }

    }

  }
);


/* =========================================================
   PAGE HIDE
========================================================= */

window.addEventListener(
  "pagehide",
  () => {

    /*
       JANGAN melakukan:

       audio.pause()
       audio.load()
       audio.src = ""

       Background playback tetap berjalan.
    */

  }
);


/* =========================================================
   PAGE SHOW
========================================================= */

window.addEventListener(
  "pageshow",
  () => {

    render();

  }
);


/* =========================================================
   PROGRESS BAR
========================================================= */

if($("bar")){

  $("bar").oninput =
    () => {

      /*
         YouTube
      */

      if(
        songs[current]?.type ===
        "yt" &&
        yt
      ){

        try{

          const duration =
            yt.getDuration();


          if(duration){

            yt.seekTo(
              (
                $("bar").value /
                100
              ) *
              duration,
              true
            );

          }

        }catch(error){}


        return;

      }


      /*
         Local
      */

      if(
        audio.duration
      ){

        audio.currentTime =
          (
            $("bar").value /
            100
          ) *
          audio.duration;


        updatePositionState();

      }

    };

}


/* =========================================================
   PLAY BUTTON
========================================================= */

if($("play")){

  $("play").onclick =
    async () => {

      if(
        current < 0
      ){

        if(songs.length){

          playSong(0);

        }

        return;

      }


      const song =
        songs[current];


      /*
         YOUTUBE
      */

      if(
        song.type === "yt"
      ){

        if(!yt)
          return;


        try{

          const state =
            yt.getPlayerState();


          if(
            state ===
            YT.PlayerState.PLAYING
          ){

            yt.pauseVideo();

          }else{

            yt.playVideo();

          }

        }catch(error){}


        return;

      }


      /*
         LOCAL
      */

      if(
        audio.paused
      ){

        try{

          await audio.play();

        }catch(error){

          console.warn(
            "Play gagal:",
            error
          );

        }

      }else{

        audio.pause();

      }

    };

}


/* =========================================================
   NEXT BUTTON
========================================================= */

if($("next")){

  $("next").onclick =
    nextSong;

}


/* =========================================================
   PREVIOUS BUTTON
========================================================= */

if($("prev")){

  $("prev").onclick =
    previousSong;

}


/* =========================================================
   PREVIOUS — APP BUTTON
========================================================= */

function previousSong(){

  if(!songs.length)
    return;


  /*
     Jika lagu lokal sudah berjalan
     lebih dari 3 detik,
     tombol Previous di dalam aplikasi
     kembali ke awal lagu.
  */

  if(
    songs[current]?.type ===
    "local" &&
    audio.currentTime > 3
  ){

    audio.currentTime =
      0;


    updatePositionState();


    return;

  }


  const index =
    current <= 0
    ?
    songs.length - 1
    :
    current - 1;


  playSong(
    index
  );

}


/* =========================================================
   SHUFFLE
========================================================= */

if($("shuffle")){

  $("shuffle").onclick =
    () => {

      shuffle =
        !shuffle;


      $("shuffle")
        .classList.toggle(
          "on",
          shuffle
        );

    };

}


/* =========================================================
   REPEAT
========================================================= */

if($("repeat")){

  $("repeat").onclick =
    () => {

      repeat =
        !repeat;


      $("repeat")
        .classList.toggle(
          "on",
          repeat
        );

    };

}


/* =========================================================
   ADD PANEL
========================================================= */

if($("addBtn")){

  $("addBtn").onclick =
    () => {

      $("panel")
        .classList.toggle(
          "open"
        );

    };

}


/* =========================================================
   NEXT SONG
========================================================= */

function nextSong(){

  if(!songs.length)
    return;


  let index;


  /*
     SHUFFLE
  */

  if(shuffle){

    if(
      songs.length === 1
    ){

      index =
        current;

    }else{

      do{

        index =
          Math.floor(
            Math.random() *
            songs.length
          );

      }while(
        index === current
      );

    }

  }else{

    index =
      current + 1;


    if(
      index >= songs.length
    ){

      if(repeat){

        index =
          0;

      }else{

        /*
           Tetap lagu terakhir.
        */

        return;

      }

    }

  }


  playSong(
    index
  );

}


/* =========================================================
   LOCAL FILE IMPORT
========================================================= */

if($("files")){

  $("files").onchange =
    async event => {

      const files =
        Array.from(
          event.target.files || []
        );


      for(
        const file of files
      ){

        await saveSong({

          id:
            crypto.randomUUID(),

          type:
            "local",

          title:
            file.name.replace(
              /\.[^/.]+$/,
              ""
            ),

          artist:
            "Local File",

          blob:
            file,

          duration:
            0

        });

      }


      songs =
        await getSongs();


      render();


      event.target.value =
        "";

    };

}


/* =========================================================
   SEARCH CACHE
========================================================= */

function getCache(key){

  return new Promise(
    resolve => {

      const request =
        db
          .transaction(
            "searchCache"
          )
          .objectStore(
            "searchCache"
          )
          .get(key);


      request.onsuccess =
        () => {

          const data =
            request.result;


          if(!data){

            resolve(null);

            return;

          }


          const age =
            Date.now() -
            data.time;


          if(
            age >
            86400000
          ){

            deleteCache(key);

            resolve(null);

          }else{

            resolve(
              data.data
            );

          }

        };


      request.onerror =
        () => {

          resolve(null);

        };

    }
  );

}


/* =========================================================
   SAVE CACHE
========================================================= */

function saveCache(
  key,
  data
){

  return new Promise(
    resolve => {

      const transaction =
        db.transaction(
          "searchCache",
          "readwrite"
        );


      transaction
        .objectStore(
          "searchCache"
        )
        .put({

          key:
            key,

          time:
            Date.now(),

          data:
            data

        });


      transaction.oncomplete =
        () => {

          resolve();

        };

    }
  );

}


/* =========================================================
   DELETE CACHE
========================================================= */

function deleteCache(key){

  const transaction =
    db.transaction(
      "searchCache",
      "readwrite"
    );


  transaction
    .objectStore(
      "searchCache"
    )
    .delete(key);

}


/* =========================================================
   YOUTUBE SEARCH
========================================================= */

async function search(){

  const input =
    $("query");


  if(!input)
    return;


  const q =
    input.value.trim();


  if(!q)
    return;


  $("results").innerHTML =
    "🔎 Mencari...";


  const key =
    q.toLowerCase();


  try{

    /*
       CACHE
    */

    const cached =
      await getCache(
        key
      );


    if(cached){

      $("results").innerHTML =
        '<small style="color:#777">⚡ Dari cache</small>';


      showResults(
        cached
      );


      return;

    }


    /*
       API KEY
    */

    if(
      !YOUTUBE_API_KEY ||
      YOUTUBE_API_KEY ===
      "ISI_API_KEY_KAMU"
    ){

      $("results").innerHTML =
        "❌ API key belum diisi.";


      return;

    }


    const requestURL =
      new URL(
        "https://www.googleapis.com/youtube/v3/search"
      );


    requestURL.searchParams.set(
      "part",
      "snippet"
    );


    requestURL.searchParams.set(
      "type",
      "video"
    );


    requestURL.searchParams.set(
      "maxResults",
      "10"
    );


    requestURL.searchParams.set(
      "q",
      q
    );


    requestURL.searchParams.set(
      "key",
      YOUTUBE_API_KEY
    );


    const response =
      await fetch(
        requestURL
      );


    if(!response.ok){

      throw new Error(
        "HTTP " +
        response.status
      );

    }


    const data =
      await response.json();


    const results =
      (data.items || [])
      .filter(
        item =>
          item.id?.videoId
      )
      .map(
        item => ({

          id:
            "yt_" +
            item.id.videoId,

          type:
            "yt",

          videoId:
            item.id.videoId,

          title:
            item.snippet.title,

          artist:
            item.snippet.channelTitle,

          thumb:
            item.snippet
              .thumbnails
              ?.medium
              ?.url ||
            item.snippet
              .thumbnails
              ?.default
              ?.url ||
            "",

          duration:
            0

        })
      );


    await saveCache(
      key,
      results
    );


    showResults(
      results
    );


  }catch(error){

    console.error(
      error
    );


    $("results").innerHTML =
      "❌ Gagal: " +
      esc(
        error.message
      );

  }

}


/* =========================================================
   CLOSE RESULTS
========================================================= */

function closeResults(){

  if($("results")){

    $("results").innerHTML =
      "";

  }

}


/* =========================================================
   SHOW YOUTUBE RESULTS
========================================================= */

function showResults(results){

  $("results").innerHTML = `

    <div class="result-head">

      <span>
        Hasil YouTube
      </span>

      <button
        id="closeResults"
      >
        ✕
      </button>

    </div>

  `;


  if($("closeResults")){

    $("closeResults").onclick =
      closeResults;

  }


  results.forEach(
    song => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "result";


      item.innerHTML = `

        <img
          src="${esc(song.thumb)}"
          alt=""
        >


        <div class="ri">

          <b>
            ${esc(song.title)}
          </b>


          <small>
            ${esc(song.artist)}
          </small>


          <button class="p">
            ▶ Play
          </button>


          <button class="a">
            ＋ Playlist
          </button>

        </div>

      `;


      const playButton =
        item.querySelector(
          ".p"
        );


      const addButton =
        item.querySelector(
          ".a"
        );


      if(playButton){

        playButton.onclick =
          () => {

            playYT(
              song
            );


            closeResults();

          };

      }


      if(addButton){

        addButton.onclick =
          async () => {

            await saveSong(
              song
            );


            songs =
              await getSongs();


            render();


            closeResults();

          };

      }


      $("results")
        .appendChild(
          item
        );

    }
  );

}


/* =========================================================
   SEARCH BUTTON
========================================================= */

if($("searchBtn")){

  $("searchBtn").onclick =
    search;

}


/* =========================================================
   SEARCH ENTER
========================================================= */

if($("query")){

  $("query").onkeydown =
    event => {

      if(
        event.key ===
        "Enter"
      ){

        search();

      }

    };

}


/* =========================================================
   YOUTUBE API READY
========================================================= */

window.onYouTubeIframeAPIReady =
  () => {

    ytReady =
      true;


    if(pending){

      const song =
        pending;


      pending =
        null;


      playYT(
        song
      );

    }

  };


/* =========================================================
   PLAY YOUTUBE
========================================================= */

function playYT(song){

  /*
     YouTube bukan native audio.
     Media Session Lock Screen terutama
     ditujukan untuk local HTMLAudioElement.
  */

  $("title").textContent =
    song.title;


  $("artist").textContent =
    song.artist;


  $("status").textContent =
    "YouTube Online";


  updateVinylCover(
    song
  );


  updateMediaSession(
    song
  );


  $("cover").innerHTML =
    song.thumb
    ?
    `<img
      src="${esc(song.thumb)}"
      alt=""
    >`
    :
    "▶";


  $("cur").textContent =
    "0:00";


  $("dur").textContent =
    "0:00";


  $("bar").value =
    0;


  if(!ytReady){

    pending =
      song;


    return;

  }


  if(yt){

    try{

      yt.loadVideoById(
        song.videoId
      );

    }catch(error){

      console.warn(
        "YouTube load:",
        error
      );

    }

  }else{

    createYT(
      song
    );

  }

}


/* =========================================================
   CREATE YOUTUBE PLAYER
========================================================= */

function createYT(song){

  yt =
    new YT.Player(
      "youtubePlayer",
      {

        width:
          "1",

        height:
          "1",

        videoId:
          song.videoId,

        playerVars:{

          autoplay:
            1,

          playsinline:
            1,

          controls:
            0,

          rel:
            0

        },


        events:{

          onReady:
            event => {

              event.target
                .playVideo();


              startYTTimer();

            },


          onStateChange:
            event => {

              if(
                event.data ===
                YT.PlayerState.PLAYING
              ){

                $("play").textContent =
                  "⏸";


                vinylPlay();


                startYTTimer();

              }


              else if(
                event.data ===
                YT.PlayerState.PAUSED
              ){

                $("play").textContent =
                  "▶";


                vinylPause();


                stopYTTimer();

              }


              else if(
                event.data ===
                YT.PlayerState.ENDED
              ){

                vinylPause();


                stopYTTimer();


                nextSong();

              }

            },


          onError:
            event => {

              $("status").textContent =
                "YouTube Error";


              vinylPause();


              console.log(
                "YouTube error:",
                event.data
              );

            }

        }

      }
    );

}


/* =========================================================
   YOUTUBE TIMER
========================================================= */

function startYTTimer(){

  stopYTTimer();


  ytTimer =
    setInterval(
      () => {

        if(!yt)
          return;


        try{

          const currentTime =
            yt.getCurrentTime();


          const duration =
            yt.getDuration();


          if(
            duration > 0
          ){

            $("cur").textContent =
              time(
                currentTime
              );


            $("dur").textContent =
              time(
                duration
              );


            $("bar").value =
              (
                currentTime /
                duration
              ) * 100;

          }

        }catch(error){}

      },
      500
    );

}


/* =========================================================
   STOP YOUTUBE
========================================================= */

function stopYT(){

  stopYTTimer();


  if(yt){

    try{

      yt.stopVideo();

    }catch(error){}

  }

}


/* =========================================================
   STOP YOUTUBE TIMER
========================================================= */

function stopYTTimer(){

  if(ytTimer){

    clearInterval(
      ytTimer
    );


    ytTimer =
      null;

  }

}


/* =========================================================
   CLEAR LIBRARY
========================================================= */

if($("clear")){

  $("clear").onclick =
    async () => {

      if(
        !confirm(
          "Hapus semua lagu?"
        )
      ){

        return;

      }


      const transaction =
        db.transaction(
          "songs",
          "readwrite"
        );


      transaction
        .objectStore(
          "songs"
        )
        .clear();


      transaction.oncomplete =
        () => {

          songs =
            [];


          current =
            -1;


          stopYT();


          audio.pause();


          audio.removeAttribute(
            "src"
          );


          audio.load();


          vinylPause();


          if(url){

            try{

              URL.revokeObjectURL(
                url
              );

            }catch(error){}


            url =
              null;

          }


          render();


          $("title").textContent =
            "Belum ada lagu";


          $("artist").textContent =
            "Tambahkan musik untuk mulai";


          $("status").textContent =
            "Ready";


          $("cur").textContent =
            "0:00";


          $("dur").textContent =
            "0:00";


          $("bar").value =
            0;


          updateMediaSession(
            null
          );


          updateVinylCover(
            null
          );

        };

    };

}


/* =========================================================
   BEFORE UNLOAD
========================================================= */

/*
   Jangan revoke Blob URL ketika halaman hanya
   masuk background.

   Hanya dilepas ketika benar-benar ditutup
   dan browser membutuhkan cleanup.
*/

window.addEventListener(
  "beforeunload",
  () => {

    /*
       Tidak pause audio di sini.
    */

  }
);


/* =========================================================
   START APPLICATION
========================================================= */

openDB()
  .then(
    async () => {

      songs =
        await getSongs();


      render();


      initVinyl();


      setupMediaSession();


      $("status").textContent =
        "Ready";

    }
  )
  .catch(
    error => {

      console.error(
        "Database error:",
        error
      );


      $("status").textContent =
        "Database Error";

    }
  );
