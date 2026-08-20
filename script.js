/* =========================================================
   MYMUSIC V2 — APP.JS
   PART 1 — FULL
   PREMIUM VINYL + SAFE VISUALIZER

   LOCAL MUSIC
   YOUTUBE
   INDEXEDDB
   MEDIA SESSION
   LOCK SCREEN PLAYBACK
   COBALT DOWNLOAD
   SAVE YOUTUBE FOR OFFLINE PLAYBACK

   IMPORTANT
   ---------------------------------------------------------
   - Native HTMLAudioElement
   - No AudioContext
   - No createMediaElementSource()
   - No AnalyserNode
   - Local playback remains background-safe
   - Cobalt digunakan untuk Download dan Save Offline
   - Play YouTube TIDAK otomatis menyimpan
   - Playlist TIDAK menyimpan file audio
   - Save Offline menyimpan audio ke IndexedDB
========================================================= */


/* =========================================================
   YOUTUBE API
========================================================= */

const YOUTUBE_API_KEY =
  "AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c";


/* =========================================================
   COBALT API
========================================================= */

const COBALT_API =
  "https://mymusic-cobalt.onrender.com/";


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
   GET SONG BY ID
========================================================= */

function getSong(id){

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
          .get(id);


      request.onsuccess =
        () => {

          resolve(
            request.result || null
          );

        };


      request.onerror =
        () => {

          resolve(null);

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
========================================================= */

function setupMediaSession(){

  if(
    !("mediaSession" in navigator)
  ){

    return;

  }


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
              song.source === "cobalt"
              ?
              "💾 Offline"
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
     LOCAL / OFFLINE
  ======================================================= */

  stopYT();


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


  if(!song.blob){

    $("status").textContent =
      "File tidak tersedia";


    return;

  }


  url =
    URL.createObjectURL(
      song.blob
    );


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
      song.source === "cobalt"
      ?
      "Offline Music"
      :
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
   AUDIO EVENTS
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
   VISIBILITY / PAGE EVENTS
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if(
      document.visibilityState ===
      "visible"
    ){

      render();


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


window.addEventListener(
  "pagehide",
  () => {

    /*
       Jangan pause audio.
    */

  }
);


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
   NEXT / PREVIOUS
========================================================= */

if($("next")){

  $("next").onclick =
    nextSong;

}


if($("prev")){

  $("prev").onclick =
    previousSong;

}


function previousSong(){

  if(!songs.length)
    return;


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
   COBALT COMMON REQUEST
   ---------------------------------------------------------
   Digunakan oleh:
   - Download
   - Save Offline

   Keduanya menggunakan proses Cobalt
   yang sama, tetapi hasil akhirnya berbeda.
========================================================= */

async function getCobaltBlob(song,button){

  if(!song?.videoId)
    throw new Error("Video YouTube tidak valid");

  const youtubeURL=
    "https://www.youtube.com/watch?v="+
    encodeURIComponent(song.videoId);

  try{

    const r=await fetch(COBALT_API,{
      method:"POST",
      headers:{
        "Accept":"application/json",
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        url:youtubeURL,
        downloadMode:"audio",
        audioFormat:"mp3"
      })
    });

    const text=await r.text();

    console.log("Cobalt HTTP:",r.status);
    console.log("Cobalt response:",text);

    if(r.ok){

      const d=JSON.parse(text);

      if(
        (d.status==="tunnel"||
         d.status==="redirect")&&
        d.url
      ){

        if(button)
          button.textContent="⬇ Mengambil audio...";

        const f=await fetch(d.url);

        if(!f.ok)
          throw new Error("Gagal mengambil audio");

        const b=await f.blob();

        if(b.size)
          return new Blob([b],{
            type:"audio/mpeg"
          });
      }

    }

    console.warn("Cobalt gagal, mencoba Piped...");

  }catch(e){

    console.warn(
      "Cobalt gagal:",
      e.message
    );

  }


  /* ===============================
     PIPED FALLBACK
  =============================== */

  if(button)
    button.textContent="🔄 Mencoba Piped...";

  const url=
    await getPipedAudio(song.videoId);

  const response=
    await fetch(url);

  if(!response.ok)
    throw new Error(
      "Piped audio gagal diambil"
    );

  const blob=
    await response.blob();

  if(!blob.size)
    throw new Error(
      "File audio Piped kosong"
    );

  return new Blob(
    [blob],
    {type:"audio/mpeg"}
  );
}
/* =========================================================
   SAVE YOUTUBE OFFLINE
   ---------------------------------------------------------
   FITUR BARU
   ---------------------------------------------------------
   - Tidak otomatis ketika Play
   - User menekan "💾 Simpan"
   - Audio diambil melalui Cobalt
   - Audio disimpan sebagai Blob di IndexedDB
   - Masuk ke Library
   - Bisa diputar tanpa internet
   - Tidak membuat file masuk folder Files
   - Tidak mengubah fitur Download
========================================================= */

async function saveYouTubeOffline(
  song,
  button
){

  if(
    !song ||
    !song.videoId
  ){

    return null;

  }


  const originalText =
    button
      ? button.textContent
      : "";


  try{

    if(button){

      button.disabled =
        true;

      button.textContent =
        "⏳ Menyimpan...";

    }


    /*
       Cek apakah sudah pernah
       disimpan offline.
    */

    const offlineId =
      "offline_" +
      song.videoId;


    const existing =
      await getSong(
        offlineId
      );


    if(
      existing &&
      existing.blob &&
      existing.blob.size
    ){

      if(button){

        button.textContent =
          "✓ Tersimpan";

      }


      return existing;

    }


    /*
       Ambil audio.
    */

    const mp3Blob =
      await getCobaltBlob(
        song,
        button
      );


    /*
       Buat lagu offline.
    */

    const offlineSong = {

      id:
        offlineId,

      type:
        "local",

      source:
        "offline",

      videoId:
        song.videoId,

      title:
        song.title ||
        "YouTube Music",

      artist:
        song.artist ||
        "YouTube",

      thumb:
        song.thumb ||
        "",

      blob:
        mp3Blob,

      duration:
        song.duration ||
        0

    };


    /*
       Simpan Blob ke IndexedDB.
    */

    await saveSong(
      offlineSong
    );


    /*
       Refresh library.
    */

    songs =
      await getSongs();


    render();


    if(button){

      button.textContent =
        "✓ Tersimpan";

    }


    if($("status")){

      $("status").textContent =
        "✓ Lagu disimpan untuk offline";

    }


    return offlineSong;


  }catch(error){

    console.error(
      "Save Offline error:",
      error
    );


    if(button){

      button.textContent =
        "❌ Gagal";

    }


    if($("status")){

      $("status").textContent =
        "Simpan offline gagal";

    }


    alert(
      "Simpan offline gagal:\n\n" +
      error.message
    );


    return null;


  }finally{

    if(button){

      setTimeout(
        () => {

          if(
            button &&
            document.body.contains(
              button
            )
          ){

            button.disabled =
              false;


            if(
              button.textContent ===
                "⏳ Menyimpan..." ||
              button.textContent ===
                "⬇ Mengambil audio..." ||
              button.textContent ===
                "❌ Gagal"
            ){

              button.textContent =
                originalText ||
                "💾 Simpan";

            }

          }

        },
        2500
      );

    }

  }

}


/* =========================================================
   CHECK OFFLINE SONG
========================================================= */

async function isYouTubeOffline(
  videoId
){

  if(!videoId)
    return false;


  const song =
    await getSong(
      "offline_" +
      videoId
    );


  return !!(
    song &&
    song.blob &&
    song.blob.size
  );

}


/* =========================================================
   SHOW YOUTUBE RESULTS
========================================================= */

async function showResults(
  results
){

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


  for(
    const song of results
  ){

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


        <div class="result-actions">

          <button class="p">
            ▶ Play
          </button>


          <button class="a">
            ＋ Playlist
          </button>


          <button class="o">
            💾 Simpan
          </button>


          <button class="d">
            ⬇ Download
          </button>

        </div>

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


    const offlineButton =
      item.querySelector(
        ".o"
      );


    const downloadButton =
      item.querySelector(
        ".d"
      );


    /*
       CEK STATUS OFFLINE
    */

    try{

      const offline =
        await isYouTubeOffline(
          song.videoId
        );


      if(offline){

        if(offlineButton){

          offlineButton.textContent =
            "✓ Tersimpan";

          offlineButton.classList.add(
            "saved"
          );

        }

      }

    }catch(error){

      console.warn(
        "Offline check:",
        error
      );

    }


    /*
       PLAY
    */

    if(playButton){

      playButton.onclick =
        () => {

          playYT(
            song
          );


          closeResults();

        };

    }


    /*
       PLAYLIST
       -----------------------------------------------------
       HANYA menyimpan referensi lagu YouTube.
       Tidak mengambil audio.
    */

    if(addButton){

      addButton.onclick =
        async () => {

          await addYouTubeSong(
            song
          );


          if(addButton){

            addButton.textContent =
              "✓ Playlist";

          }

        };

    }


    /*
       SAVE OFFLINE
    */

    if(offlineButton){

      offlineButton.onclick =
        async event => {

          event.stopPropagation();


          const saved =
            await saveYouTubeOffline(
              song,
              offlineButton
            );


          if(saved){

            offlineButton.textContent =
              "✓ Tersimpan";

            offlineButton.classList.add(
              "saved"
            );

          }

        };

    }


    /*
       DOWNLOAD
    */

    if(downloadButton){

      downloadButton.onclick =
        async event => {

          event.stopPropagation();


          await downloadCobalt(
            song,
            downloadButton
          );

        };

    }


    $("results")
      .appendChild(
        item
      );

  }

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
   END OF PART 1
   ---------------------------------------------------------
   PART 2 DIMULAI DARI SINI:
   YOUTUBE IFRAME PLAYER
========================================================= 
*/

/* =========================================================
   MYMUSIC V2 — APP.JS
   PART 2
   ---------------------------------------------------------
   YOUTUBE PLAYER
   YOUTUBE IFRAME API
   DURATION
   OFFLINE PLAYBACK SUPPORT
   BACKGROUND / LOCK SCREEN
   INITIALIZATION
========================================================= */


/* =========================================================
   YOUTUBE PLAYER CONTAINER
========================================================= */

function createYTContainer(){

  if($("ytPlayer"))
    return $("ytPlayer");


  const container =
    document.createElement("div");


  container.id =
    "ytPlayer";


  container.style.position =
    "fixed";


  container.style.width =
    "1px";


  container.style.height =
    "1px";


  container.style.left =
    "-9999px";


  container.style.top =
    "0";


  container.style.opacity =
    "0";


  container.style.pointerEvents =
    "none";


  container.style.overflow =
    "hidden";


  document.body.appendChild(
    container
  );


  return container;

}


/* =========================================================
   LOAD YOUTUBE IFRAME API
========================================================= */

function loadYouTubeAPI(){

  if(
    window.YT &&
    window.YT.Player
  ){

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


    return;

  }


  /*
     Jika script sudah ada,
     jangan masukkan dua kali.
  */

  if(
    document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    )
  ){

    return;

  }


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


  const script =
    document.createElement(
      "script"
    );


  script.src =
    "https://www.youtube.com/iframe_api";


  script.async =
    true;


  document.head.appendChild(
    script
  );

}


/* =========================================================
   CREATE YOUTUBE PLAYER
========================================================= */

function initYTPlayer(){

  if(yt)
    return;


  if(
    !window.YT ||
    !window.YT.Player
  ){

    loadYouTubeAPI();

    return;

  }


  const container =
    createYTContainer();


  try{

    yt =
      new YT.Player(
        container,
        {

          width:
            "1",

          height:
            "1",

          videoId:
            "",

          playerVars:{

            autoplay:
              0,

            controls:
              0,

            playsinline:
              1,

            rel:
              0,

            modestbranding:
              1,

            iv_load_policy:
              3,

            fs:
              0

          },

          events:{

            onReady:
              onYTReady,

            onStateChange:
              onYTStateChange,

            onError:
              onYTError

          }

        }
      );

  }catch(error){

    console.error(
      "YT Player gagal dibuat:",
      error
    );

  }

}


/* =========================================================
   YOUTUBE READY
========================================================= */

function onYTReady(){

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

}


/* =========================================================
   PLAY YOUTUBE
========================================================= */

function playYT(song){

  if(
    !song ||
    !song.videoId
  ){

    return;

  }


  /*
     Pastikan lagu ada di state.
  */

  const index =
    songs.findIndex(
      item =>
        item.id === song.id
    );


  if(index >= 0){

    current =
      index;

  }


  /*
     Jika API belum siap.
  */

  if(
    !window.YT ||
    !window.YT.Player
  ){

    pending =
      song;


    loadYouTubeAPI();


    if($("status")){

      $("status").textContent =
        "Memuat YouTube...";

    }


    return;

  }


  if(!yt){

    pending =
      song;


    initYTPlayer();


    if($("status")){

      $("status").textContent =
        "Memuat YouTube...";

    }


    return;

  }


  if(!ytReady){

    pending =
      song;


    if($("status")){

      $("status").textContent =
        "Menyiapkan YouTube...";

    }


    return;

  }


  try{

    /*
       Pastikan local audio berhenti.
    */

    audio.pause();


    if(url){

      try{

        URL.revokeObjectURL(
          url
        );

      }catch(error){}


      url =
        null;

    }


    vinylPause();


    updateVinylCover(
      song
    );


    if($("title")){

      $("title").textContent =
        song.title ||
        "YouTube";

    }


    if($("artist")){

      $("artist").textContent =
        song.artist ||
        "YouTube";

    }


    if($("cover")){

      $("cover").innerHTML =
        song.thumb
        ?
        `<img
          src="${esc(song.thumb)}"
          alt=""
        >`
        :
        "▶";

    }


    if($("status")){

      $("status").textContent =
        "YouTube";

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


    updateMediaSession(
      song
    );


    setMediaState(
      "none"
    );


    /*
       Load video.
    */

    yt.loadVideoById(
      song.videoId
    );


  }catch(error){

    console.error(
      "Play YouTube error:",
      error
    );


    if($("status")){

      $("status").textContent =
        "YouTube gagal diputar";

    }

  }

}


/* =========================================================
   YOUTUBE STATE
========================================================= */

function onYTStateChange(event){

  if(
    !yt ||
    !window.YT
  )
    return;


  const state =
    event.data;


  /*
     PLAYING
  */

  if(
    state ===
    YT.PlayerState.PLAYING
  ){

    vinylPlay();


    if($("play")){

      $("play").textContent =
        "⏸";

    }


    if($("status")){

      $("status").textContent =
        "YouTube • Playing";

    }


    setMediaState(
      "playing"
    );


    updateYTDuration();


    startYTTimer();


    return;

  }


  /*
     PAUSED
  */

  if(
    state ===
    YT.PlayerState.PAUSED
  ){

    vinylPause();


    if($("play")){

      $("play").textContent =
        "▶";

    }


    if($("status")){

      $("status").textContent =
        "YouTube • Paused";

    }


    setMediaState(
      "paused"
    );


    stopYTTimer();


    return;

  }


  /*
     BUFFERING
  */

  if(
    state ===
    YT.PlayerState.BUFFERING
  ){

    if($("status")){

      $("status").textContent =
        "YouTube • Buffering...";

    }


    return;

  }


  /*
     ENDED
  */

  if(
    state ===
    YT.PlayerState.ENDED
  ){

    vinylPause();


    stopYTTimer();


    if($("play")){

      $("play").textContent =
        "▶";

    }


    setMediaState(
      "none"
    );


    nextSong();


    return;

  }

}


/* =========================================================
   YOUTUBE ERROR
========================================================= */

function onYTError(event){

  console.error(
    "YouTube Error:",
    event.data
  );


  stopYTTimer();


  vinylPause();


  if($("play")){

    $("play").textContent =
      "▶";

  }


  if($("status")){

    $("status").textContent =
      "YouTube Error";

  }


  let message =
    "YouTube tidak dapat diputar";


  if(
    event.data === 100
  ){

    message =
      "Video YouTube tidak ditemukan";

  }


  if(
    event.data === 101 ||
    event.data === 150
  ){

    message =
      "Video ini tidak mengizinkan pemutaran di aplikasi";

  }


  console.warn(
    message,
    event.data
  );

}


/* =========================================================
   STOP YOUTUBE
========================================================= */

function stopYT(){

  stopYTTimer();


  if(!yt)
    return;


  try{

    yt.stopVideo();

  }catch(error){}


  try{

    yt.pauseVideo();

  }catch(error){}

}


/* =========================================================
   YOUTUBE TIMER
========================================================= */

function startYTTimer(){

  stopYTTimer();


  ytTimer =
    setInterval(
      updateYTProgress,
      500
    );


  updateYTProgress();

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
   UPDATE YOUTUBE PROGRESS
========================================================= */

function updateYTProgress(){

  if(
    !yt ||
    !ytReady
  ){

    return;

  }


  try{

    const duration =
      yt.getDuration();


    const currentTime =
      yt.getCurrentTime();


    if(
      !duration ||
      !isFinite(duration)
    ){

      return;

    }


    if($("bar")){

      $("bar").value =
        (
          currentTime /
          duration
        ) *
        100;

    }


    if($("cur")){

      $("cur").textContent =
        time(
          currentTime
        );

    }


    if($("dur")){

      $("dur").textContent =
        time(
          duration
        );

    }


    /*
       Simpan durasi YouTube.
    */

    if(
      current >= 0 &&
      songs[current] &&
      songs[current].type ===
      "yt"
    ){

      const song =
        songs[current];


      if(
        !song.duration ||
        Math.abs(
          song.duration -
          duration
        ) > 1
      ){

        song.duration =
          duration;


        saveSong(
          song
        ).catch(()=>{});

      }

    }

  }catch(error){}

}


/* =========================================================
   UPDATE YOUTUBE DURATION
========================================================= */

function updateYTDuration(){

  if(
    !yt ||
    !ytReady
  )
    return;


  try{

    const duration =
      yt.getDuration();


    if(
      !duration ||
      !isFinite(duration)
    ){

      return;

    }


    if($("dur")){

      $("dur").textContent =
        time(duration);

    }


    if(
      current >= 0 &&
      songs[current]
    ){

      songs[current].duration =
        duration;


      saveSong(
        songs[current]
      ).catch(()=>{});

    }

  }catch(error){}

}


/* =========================================================
   YOUTUBE SEARCH RESULT DURATION
========================================================= */

 /*
    Search API tidak memberikan duration.
    Duration akan diambil saat video dimainkan.
 */


/* =========================================================
   ADD YOUTUBE SONG TO PLAYLIST
   ---------------------------------------------------------
   PENTING:
   Ini TIDAK mendownload audio.
   Hanya menyimpan informasi lagu ke
   IndexedDB agar lagu tetap ada di
   Library.
========================================================= */

async function addYouTubeSong(song){

  if(
    !song ||
    !song.videoId
  ){

    return;

  }


  /*
     Cek apakah sudah ada.
  */

  const exists =
    songs.some(
      item =>
        item.id === song.id
    );


  if(exists){

    return;

  }


  await saveSong(
    song
  );


  songs =
    await getSongs();


  render();

}


/* =========================================================
   CHECK YOUTUBE SONG IN LIBRARY
========================================================= */

async function getSongById(id){

  if(!id)
    return null;


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
          .get(id);


      request.onsuccess =
        () => {

          resolve(
            request.result ||
            null
          );

        };


      request.onerror =
        () => {

          resolve(
            null
          );

        };

    }
  );

}


/* =========================================================
   CHECK OFFLINE STATUS
   ---------------------------------------------------------
   Lagu dianggap Offline jika
   memiliki Blob audio yang tersimpan
   di IndexedDB.
========================================================= */

function isSongOffline(song){

  if(!song)
    return false;


  return (
    song.type === "local" &&
    !!song.blob &&
    (
      song.source === "cobalt" ||
      song.source === "offline"
    )
  );

}


/* =========================================================
   FIND OFFLINE VERSION
========================================================= */

async function getOfflineSong(videoId){

  if(!videoId)
    return null;


  /*
     ID offline dibuat:
     cobalt_VIDEO_ID
  */

  const id =
    "cobalt_" +
    videoId;


  const song =
    await getSongById(
      id
    );


  if(
    song &&
    song.blob
  ){

    return song;

  }


  /*
     Fallback:
     cari berdasarkan videoId
     jika struktur berubah.
  */

  const allSongs =
    await getSongs();


  return (
    allSongs.find(
      item =>
        item.videoId === videoId &&
        item.blob
    )
    ||
    null
  );

}


/* =========================================================
   PLAY OFFLINE YOUTUBE SONG
   ---------------------------------------------------------
   Menggunakan HTMLAudioElement.
   Ini penting agar:
   - Background playback
   - Lock screen
   - Media Session
   tetap menggunakan sistem local
   yang sudah bekerja.
========================================================= */

function playOfflineSong(song){

  if(
    !song ||
    !song.blob
  ){

    return false;

  }


  current =
    songs.findIndex(
      item =>
        item.id === song.id
    );


  if(
    current < 0
  ){

    songs.push(
      song
    );


    current =
      songs.length - 1;

  }


  render();


  /*
     Hentikan YouTube.
  */

  stopYT();


  /*
     Bersihkan object URL lama.
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


  vinylPause();


  /*
     Metadata UI.
  */

  if($("title")){

    $("title").textContent =
      song.title ||
      "Offline Music";

  }


  if($("artist")){

    $("artist").textContent =
      song.artist ||
      "YouTube";

  }


  updateVinylCover(
    song
  );


  if($("cover")){

    $("cover").innerHTML =
      song.thumb
      ?
      `<img
        src="${esc(song.thumb)}"
        alt=""
      >`
      :
      "♪";

  }


  if($("status")){

    $("status").textContent =
      "Offline Music";

  }


  /*
     Media Session mengenali lagu
     sebagai local audio.
  */

  updateMediaSession(
    song
  );


  /*
     Object URL dari Blob IndexedDB.
  */

  try{

    url =
      URL.createObjectURL(
        song.blob
      );

  }catch(error){

    console.error(
      "Object URL gagal:",
      error
    );


    if($("status")){

      $("status").textContent =
        "Offline file gagal dibuka";

    }


    return false;

  }


  audio.pause();


  audio.src =
    url;


  audio.preload =
    "auto";


  audio.load();


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


  const promise =
    audio.play();


  if(promise){

    promise.catch(
      error => {

        console.warn(
          "Offline playback gagal:",
          error
        );


        if($("status")){

          $("status").textContent =
            "Offline playback gagal";

        }

      }
    );

  }


  return true;

}


/* =========================================================
   SAVE YOUTUBE AS OFFLINE
   ---------------------------------------------------------
   Fungsi ini mengambil audio dari
   Cobalt lalu menyimpannya sebagai
   Blob di IndexedDB.

   Jadi:
   PLAY   = hanya play
   +PLAYLIST = hanya simpan data
   OFFLINE = download + simpan Blob
========================================================= */

async function saveYouTubeOffline(
  song,
  button
){

  if(
    !song ||
    !song.videoId
  ){

    return null;

  }


  const originalText =
    button
      ? button.textContent
      : "";


  try{

    /*
       Cek apakah sudah offline.
    */

    const existing =
      await getOfflineSong(
        song.videoId
      );


    if(
      existing &&
      existing.blob
    ){

      /*
         Sudah tersimpan.
      */

      if(button){

        button.disabled =
          false;

        button.textContent =
          "✓ Offline";

      }


      return existing;

    }


    if(button){

      button.disabled =
        true;

      button.textContent =
        "⏳ Menyiapkan...";

    }


    /*
       URL YouTube.
    */

    const youtubeURL =
      "https://www.youtube.com/watch?v=" +
      encodeURIComponent(
        song.videoId
      );


    /*
       Request Cobalt.
    */

    const response =
      await fetch(
        COBALT_API,
        {

          method:
            "POST",

          headers:{

            "Accept":
              "application/json",

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              url:
                youtubeURL,

              downloadMode:
                "audio",

              audioFormat:
                "mp3"

            })

        }
      );


    /*
       Baca text dahulu agar
       error Cobalt mudah dibaca.
    */

    const responseText =
      await response.text();


    console.log(
      "Offline Cobalt HTTP:",
      response.status
    );


    console.log(
      "Offline Cobalt response:",
      responseText
    );


    if(!response.ok){

      throw new Error(
        "Cobalt HTTP " +
        response.status +
        "\n" +
        responseText
      );

    }


    let data;


    try{

      data =
        JSON.parse(
          responseText
        );

    }catch(error){

      throw new Error(
        "Response Cobalt bukan JSON:\n" +
        responseText
      );

    }


    /*
       Cobalt error.
    */

    if(
      data.status ===
      "error"
    ){

      const code =
        data.error?.code ||
        "";


      const message =
        data.error?.message ||
        "";


      throw new Error(
        code ||
        message ||
        "Cobalt gagal memproses audio"
      );

    }


    /*
       Cobalt 11.7.1:
       tunnel / redirect.
    */

    if(
      data.status !==
        "tunnel" &&
      data.status !==
        "redirect"
    ){

      throw new Error(
        "Status Cobalt tidak dikenali: " +
        (
          data.status ||
          "unknown"
        )
      );

    }


    if(
      !data.url
    ){

      throw new Error(
        "URL audio tidak ditemukan"
      );

    }


    if(button){

      button.textContent =
        "⬇ Menyimpan...";

    }


    /*
       Ambil file audio.
    */

    const fileResponse =
      await fetch(
        data.url
      );


    if(!fileResponse.ok){

      throw new Error(
        "Gagal mengambil audio (" +
        fileResponse.status +
        ")"
      );

    }


    const blob =
      await fileResponse.blob();


    if(
      !blob ||
      !blob.size
    ){

      throw new Error(
        "File audio kosong"
      );

    }


    /*
       Pastikan MIME audio.
    */

    const audioBlob =
      new Blob(
        [blob],
        {
          type:
            "audio/mpeg"
        }
      );


    /*
       Simpan sebagai LOCAL SONG.
       Dengan begitu playback memakai
       HTMLAudioElement dan Media Session.
    */

    const offlineSong = {

      id:
        "cobalt_" +
        song.videoId,

      type:
        "local",

      source:
        "offline",

      videoId:
        song.videoId,

      title:
        song.title ||
        "YouTube Music",

      artist:
        song.artist ||
        "YouTube",

      thumb:
        song.thumb ||
        "",

      blob:
        audioBlob,

      duration:
        song.duration ||
        0

    };


    /*
       Simpan ke IndexedDB.
    */

    await saveSong(
      offlineSong
    );


    /*
       Refresh library.
    */

    songs =
      await getSongs();


    render();


    if(button){

      button.textContent =
        "✓ Offline";

    }


    if($("status")){

      $("status").textContent =
        "Tersimpan untuk Offline";

    }


    return offlineSong;

  }catch(error){

    console.error(
      "Save offline error:",
      error
    );


    if(button){

      button.textContent =
        "❌ Gagal";

    }


    if($("status")){

      $("status").textContent =
        "Simpan offline gagal";

    }


    alert(
      "Simpan offline gagal:\n\n" +
      error.message
    );


    return null;

  }finally{

    /*
       Jangan menghilangkan status
       ✓ Offline.
    */

    if(button){

      setTimeout(
        () => {

          if(
            !button ||
            !document.body.contains(
              button
            )
          ){

            return;

          }


          if(
            button.textContent ===
            "⏳ Menyiapkan..." ||
            button.textContent ===
            "⬇ Menyimpan..." ||
            button.textContent ===
            "❌ Gagal"
          ){

            button.disabled =
              false;


            button.textContent =
              originalText ||
              "💾 Offline";

          }


        },
        2500
      );

    }

  }

}


/* =========================================================
   ADD YOUTUBE SONG
========================================================= */

async function addYouTubeSong(song){

  if(
    !song ||
    !song.videoId
  ){

    return;

  }


  /*
     Jika sudah ada berdasarkan
     videoId, jangan duplikat.
  */

  const exists =
    songs.some(
      item =>
        item.videoId ===
        song.videoId
    );


  if(exists){

    return;

  }


  await saveSong(
    song
  );


  songs =
    await getSongs();


  render();

}


/* =========================================================
   PLAYLIST BUTTON SUPPORT
========================================================= */

document.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        ".a"
      );


    if(!button)
      return;


    const result =
      button.closest(
        ".result"
      );


    if(!result)
      return;


    /*
       Handler utama sudah dibuat
       di showResults().
    */

  }
);


/* =========================================================
   YOUTUBE SEARCH RESULT CLICK GUARD
========================================================= */

if($("results")){

  $("results").addEventListener(
    "click",
    event => {

      const result =
        event.target.closest(
          ".result"
        );


      if(!result)
        return;


      /*
         Jangan membuat seluruh
         result ikut play.
      */

    }
  );

}


/* =========================================================
   OFFLINE RESULT BUTTON STATE
   ---------------------------------------------------------
   Update tombol setelah library
   sudah memiliki file offline.
========================================================= */

async function updateOfflineButtons(){

  if(!$("results"))
    return;


  const buttons =
    Array.from(
      $("results").querySelectorAll(
        ".result .o"
      )
    );


  if(!buttons.length)
    return;


  for(
    const button of buttons
  ){

    const result =
      button.closest(
        ".result"
      );


    if(!result)
      continue;


    const videoId =
      result.dataset.videoId;


    if(!videoId)
      continue;


    const offlineSong =
      await getOfflineSong(
        videoId
      );


    if(
      offlineSong &&
      offlineSong.blob
    ){

      button.textContent =
        "✓ Offline";


      button.disabled =
        false;


      button.classList.add(
        "saved"
      );

    }

  }

}


/* =========================================================
   RESULT SONG OBJECT
   ---------------------------------------------------------
   Ambil data song langsung dari
   element result.
========================================================= */

function getResultSong(
  result
){

  if(!result)
    return null;


  const videoId =
    result.dataset.videoId;


  if(!videoId)
    return null;


  const title =
    result.querySelector(
      ".ri b"
    )?.textContent ||
    "YouTube Music";


  const artist =
    result.querySelector(
      ".ri small"
    )?.textContent ||
    "YouTube";


  const image =
    result.querySelector(
      "img"
    );


  const thumb =
    image?.src ||
    "";


  return {

    id:
      "yt_" +
      videoId,

    type:
      "yt",

    videoId:
      videoId,

    title:
      title,

    artist:
      artist,

    thumb:
      thumb,

    duration:
      0

  };

}


/* =========================================================
   FILE TYPE VALIDATION
========================================================= */

function isSupportedAudioFile(file){

  if(!file)
    return false;


  const name =
    file.name.toLowerCase();


  return (
    /\.(mp3|wav|m4a|aac|ogg|mp4|webm)$/i
      .test(name)
  );

}


/* =========================================================
   PANEL CLOSE
========================================================= */

function closePanel(){

  if($("panel")){

    $("panel")
      .classList.remove(
        "open"
      );

  }

}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    /*
       Jangan mengganggu input.
    */

    if(
      event.target.tagName ===
      "INPUT" ||
      event.target.tagName ===
      "TEXTAREA"
    ){

      return;

    }


    /*
       Space = Play/Pause
    */

    if(
      event.code ===
      "Space"
    ){

      event.preventDefault();


      if($("play")){

        $("play").click();

      }

    }


    /*
       Arrow Right = Next
    */

    if(
      event.code ===
      "ArrowRight"
    ){

      nextSong();

    }


    /*
       Arrow Left = Previous
    */

    if(
      event.code ===
      "ArrowLeft"
    ){

      previousSong();

    }

  }
);


/* =========================================================
   CLEAN OLD OBJECT URL
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    if(url){

      try{

        URL.revokeObjectURL(
          url
        );

      }catch(error){}

    }


    stopYTTimer();

  }
);


/* =========================================================
   INITIALIZATION
========================================================= */

async function initMyMusic(){

  try{

    /*
       IndexedDB
    */

    await openDB();


    /*
       Ambil library.
    */

    songs =
      await getSongs();


    /*
       Render awal.
    */

    render();


    /*
       Vinyl.
    */

    initVinyl();


    /*
       Media Session.
    */

    setupMediaSession();


    /*
       YouTube API.
       Tidak langsung membuat player.
    */

    loadYouTubeAPI();


    /*
       Status awal.
    */

    if(
      $("status") &&
      !songs.length
    ){

      $("status").textContent =
        "MyMusic Ready";

    }


    /*
       Restore shuffle.
    */

    if($("shuffle")){

      $("shuffle")
        .classList.toggle(
          "on",
          shuffle
        );

    }


    /*
       Restore repeat.
    */

    if($("repeat")){

      $("repeat")
        .classList.toggle(
          "on",
          repeat
        );

    }


  }catch(error){

    console.error(
      "MyMusic initialization error:",
      error
    );


    if($("status")){

      $("status").textContent =
        "Database Error";

    }

  }

}


/* =========================================================
   DOM READY
========================================================= */

if(
  document.readyState ===
  "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    initMyMusic
  );

}else{

  initMyMusic();

}


/* =========================================================
   SERVICE WORKER
========================================================= */

if(
  "serviceWorker" in navigator
){

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register(
          "./sw.js"
        )
        .then(
          registration => {

            console.log(
              "Service Worker aktif:",
              registration.scope
            );

          }
        )
        .catch(
          error => {

            console.warn(
              "Service Worker tidak tersedia:",
              error
            );

          }
        );

    }
  );

}


/* =========================================================
   MEDIA SESSION — UPDATE POSITION
========================================================= */

setInterval(
  () => {

    if(
      current < 0 ||
      !songs[current]
    ){

      return;

    }


    if(
      songs[current].type ===
      "local"
    ){

      if(
        !audio.paused
      ){

        updatePositionState();

      }

    }

  },
  1000
);


/* =========================================================
   NETWORK STATUS
========================================================= */

window.addEventListener(
  "online",
  () => {

    if($("status")){

      if(
        current >= 0 &&
        songs[current]
      ){

        if(
          songs[current].type ===
          "yt"
        ){

          $("status").textContent =
            "YouTube Online";

        }

      }

    }

  }
);


window.addEventListener(
  "offline",
  () => {

    /*
       Offline audio yang sudah
       tersimpan di IndexedDB tetap
       dapat dimainkan.
    */

    if(
      current >= 0 &&
      songs[current] &&
      songs[current].type ===
      "local"
    ){

      if($("status")){

        $("status").textContent =
          "Offline • Local Music";

      }

    }

  }
);


/* =========================================================
   FINAL PUBLIC API
========================================================= */

window.MyMusic = {

  get songs(){

    return songs;

  },


  get current(){

    return current;

  },


  play(index){

    playSong(
      index
    );

  },


  next(){

    nextSong();

  },


  previous(){

    previousSong();

  },


  search(){

    search();

  },


  closeResults(){

    closeResults();

  },


  closePanel(){

    closePanel();

  },


  download(song){

    return downloadCobalt(
      song
    );

  },


  offline(song){

    return saveYouTubeOffline(
      song
    );

  },


  playOffline(song){

    return playOfflineSong(
      song
    );

  }

};


/* =========================================================
   END OF MYMUSIC V2 — APP.JS PART 2
========================================================= 

*/
const PIPED=[
"https://pipedapi.kavin.rocks",
"https://pipedapi.adminforge.de",
"https://pipedapi.reallyaweso.me"
];

async function getPipedAudio(id){
  for(const api of PIPED){
    try{
      const c=new AbortController();
      const t=setTimeout(()=>c.abort(),8000);

      const r=await fetch(`${api}/streams/${id}`,{
        signal:c.signal
      });

      clearTimeout(t);

      if(!r.ok)continue;

      const d=await r.json();

      const s=(d.audioStreams||[])
        .filter(x=>x.url&&!x.videoOnly)
        .sort((a,b)=>(b.bitrate||0)-(a.bitrate||0))[0];

      if(s){
        console.log("Piped OK:",api);
        return s.url;
      }
    }catch(e){
      console.warn("Piped gagal:",api);
    }
  }

  throw new Error("Semua Piped gagal");
}

window.testPiped=async()=>{
  const id=prompt("Masukkan URL YouTube:");
  if(!id)return;

  const m=id.match(
    /(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/
  );

  if(!m){
    alert("URL YouTube tidak valid");
    return;
  }

  try{
    const url=await getPipedAudio(m[1]);
    alert("PIPED BERHASIL!\n\nAudio berhasil ditemukan.");
    console.log(url);
  }catch(e){
    alert("PIPED GAGAL:\n\n"+e.message);
  }
};

setTimeout(()=>{
  const b=document.createElement("button");
  b.textContent="TEST PIPED";
  b.style.cssText=
    "position:fixed;bottom:20px;right:20px;z-index:99999;padding:12px 18px;border-radius:20px;background:#fff;color:#000;font-weight:bold";
  b.onclick=window.testPiped;
  document.body.appendChild(b);
},1000);
