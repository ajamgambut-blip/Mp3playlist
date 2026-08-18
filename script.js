/* =========================================================
   MYMUSIC V2 — APP.JS
   Premium Vinyl + Safe Visualizer
   YouTube + Local Music + IndexedDB

   V2 FOCUS
   ---------------------------------------------------------
   - Native HTMLAudioElement untuk local playback
   - Tidak menggunakan createMediaElementSource()
   - Media Session / Lock Screen controls
   - IndexedDB local files
   - Background-safe architecture
   - Vinyl tetap berjalan
   - Visualizer tidak mengambil alih audio
========================================================= */

const YOUTUBE_API_KEY =
  "AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c";

const $ = id => document.getElementById(id);

const audio = $("audio");
const playlist = $("playlist");

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

const DB = "MyMusicDB";
const VERSION = 2;

let db;


/* =========================================================
   OPEN DATABASE
========================================================= */

function openDB(){

  return new Promise((resolve,reject)=>{

    const r = indexedDB.open(DB,VERSION);

    r.onupgradeneeded = e => {

      const d = e.target.result;

      if(
        !d.objectStoreNames.contains("songs")
      ){

        d.createObjectStore(
          "songs",
          {keyPath:"id"}
        );

      }

      if(
        !d.objectStoreNames.contains("searchCache")
      ){

        d.createObjectStore(
          "searchCache",
          {keyPath:"key"}
        );

      }

    };

    r.onsuccess = e => {

      db = e.target.result;

      resolve();

    };

    r.onerror = () => {

      reject(r.error);

    };

  });

}


/* =========================================================
   GET SONGS
========================================================= */

function getSongs(){

  return new Promise(resolve=>{

    const r =
      db
        .transaction("songs")
        .objectStore("songs")
        .getAll();

    r.onsuccess = () => {

      resolve(r.result || []);

    };

    r.onerror = () => {

      resolve([]);

    };

  });

}


/* =========================================================
   SAVE SONG
========================================================= */

function saveSong(song){

  return new Promise((resolve,reject)=>{

    const t =
      db.transaction(
        "songs",
        "readwrite"
      );

    t.objectStore("songs").put(song);

    t.oncomplete = resolve;

    t.onerror = () => {

      reject(t.error);

    };

  });

}


/* =========================================================
   REMOVE SONG
========================================================= */

function removeSong(id){

  return new Promise((resolve,reject)=>{

    const t =
      db.transaction(
        "songs",
        "readwrite"
      );

    t.objectStore("songs").delete(id);

    t.oncomplete = resolve;

    t.onerror = () => {

      reject(t.error);

    };

  });

}


/* =========================================================
   HELPERS
========================================================= */

function time(seconds){

  if(
    !isFinite(seconds) ||
    seconds < 0
  ){

    return "0:00";

  }

  return (
    Math.floor(seconds / 60)
    +
    ":"
    +
    String(
      Math.floor(seconds % 60)
    ).padStart(2,"0")
  );

}


function esc(value){

  return String(value || "")
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

  const cover = $("cover");

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
   VINYL STATE
========================================================= */

function vinylPlay(){

  if(vinyl){

    vinyl.classList.add(
      "playing"
    );

  }

}


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

/*
   IMPORTANT:

   V2 TIDAK menggunakan:

   audioContext
   createMediaElementSource()
   AnalyserNode

   Audio tetap 100% melalui native <audio>.

   Visualizer hanya menggunakan animasi ringan
   berdasarkan status/currentTime audio.

   Tujuannya agar visualizer tidak menjadi bagian
   dari jalur playback iOS.
*/


let visualizerFrame = null;


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


  /*
     Jangan membebani background.
  */

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


  const bars = 52;

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

      /*
         Pseudo spectrum.

         Ini bukan mengambil audio data,
         sehingga tidak menyentuh jalur audio.
      */

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
            Date.now()/1500
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
      () => {

        if(
          songs[current]?.type ===
          "local"
        ){

          audio.play()
            .catch(()=>{});

        }

      }
    );

  }catch(e){}


  try{

    navigator.mediaSession.setActionHandler(
      "pause",
      () => {

        if(
          songs[current]?.type ===
          "local"
        ){

          audio.pause();

        }

      }
    );

  }catch(e){}


  try{

    navigator.mediaSession.setActionHandler(
      "nexttrack",
      () => {

        nextSong();

      }
    );

  }catch(e){}


  try{

    navigator.mediaSession.setActionHandler(
      "previoustrack",
      () => {

        previousSong();

      }
    );

  }catch(e){}


  try{

    navigator.mediaSession.setActionHandler(
      "seekbackward",
      details => {

        const offset =
          details.seekOffset || 10;


        audio.currentTime =
          Math.max(
            0,
            audio.currentTime - offset
          );

      }
    );

  }catch(e){}


  try{

    navigator.mediaSession.setActionHandler(
      "seekforward",
      details => {

        const offset =
          details.seekOffset || 10;


        audio.currentTime =
          Math.min(
            audio.duration || Infinity,
            audio.currentTime + offset
          );

      }
    );

  }catch(e){}

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

  }catch(e){

    console.warn(
      "Media Session:",
      e
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

  }catch(e){}

}


/* =========================================================
   LIBRARY RENDER
========================================================= */

function render(){

  playlist.innerHTML = "";


  $("count").textContent =
    songs.length +
    " lagu";


  if(!songs.length){

    playlist.innerHTML =
      '<div class="empty">Belum ada musik</div>';

    return;

  }


  songs.forEach(
    (s,i)=>{

      const d =
        document.createElement("div");


      d.className =
        "song" +
        (
          i === current
          ?
          " current"
          :
          ""
        );


      d.innerHTML = `

        <div class="sc">

          ${
            s.thumb
            ?
            `<img src="${esc(s.thumb)}">`
            :
            "♪"
          }

        </div>


        <div class="si">

          <b>
            ${esc(s.title)}
          </b>


          <small>

            ${
              s.type === "yt"
              ?
              "▶ YouTube"
              :
              "📁 Lokal"
            }

            ·

            ${esc(s.artist)}

            ${
              s.duration
              ?
              " · " +
              time(s.duration)
              :
              ""
            }

          </small>

        </div>


        <button class="del">
          ×
        </button>

      `;


      d.onclick =
        e => {

          if(
            e.target.closest(".del")
          )
            return;


          playSong(i);

        };


      d.querySelector(".del")
        .onclick =
        async e => {

          e.stopPropagation();


          if(
            current >= 0 &&
            songs[current]?.id === s.id
          ){

            audio.pause();

            stopYT();

            vinylPause();

          }


          await removeSong(
            s.id
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


      playlist.appendChild(d);

    }
  );

}


/* =========================================================
   PLAY SONG
========================================================= */

function playSong(i){

  if(!songs[i])
    return;


  current = i;


  const song =
    songs[i];


  render();


  $("title").textContent =
    song.title;


  $("artist").textContent =
    song.artist;


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

    playYT(song);

    return;

  }


  /* =======================================================
     LOCAL
  ======================================================= */

  stopYT();


  vinylPause();


  /*
     Release old object URL.
  */

  if(url){

    try{

      URL.revokeObjectURL(
        url
      );

    }catch(e){}

    url = null;

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

     Tidak ada AudioContext.

     Tidak ada Web Audio.

     Tidak ada analyser.

     Hanya HTMLAudioElement.
  */

  audio.src = url;

  audio.preload = "auto";

  audio.load();


  $("cover").innerHTML =
    "♪";


  $("status").textContent =
    "Local Music";


  $("bar").value = 0;


  $("cur").textContent =
    "0:00";


  $("dur").textContent =
    song.duration
    ?
    time(song.duration)
    :
    "0:00";


  /*
     Mulai playback.
  */

  const promise =
    audio.play();


  if(promise){

    promise.catch(
      err => {

        console.warn(
          "Playback gagal:",
          err
        );

      }
    );

  }

}


/* =========================================================
   AUDIO METADATA
========================================================= */

audio.addEventListener(
  "loadedmetadata",
  () => {

    if(
      isFinite(
        audio.duration
      )
    ){

      $("dur").textContent =
        time(
          audio.duration
        );


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

    }

  }
);


/* =========================================================
   AUDIO TIME
========================================================= */

audio.addEventListener(
  "timeupdate",
  () => {

    if(
      !audio.duration
    )
      return;


    $("bar").value =
      (
        audio.currentTime /
        audio.duration
      ) * 100;


    $("cur").textContent =
      time(
        audio.currentTime
      );

  }
);


/* =========================================================
   AUDIO PLAY
========================================================= */

audio.addEventListener(
  "play",
  () => {

    $("play").textContent =
      "⏸";


    vinylPlay();


    setMediaState(
      "playing"
    );

  }
);


/* =========================================================
   AUDIO PAUSE
========================================================= */

audio.addEventListener(
  "pause",
  () => {

    $("play").textContent =
      "▶";


    vinylPause();


    setMediaState(
      "paused"
    );

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


    $("status").textContent =
      "Audio Error";

  }
);


/* =========================================================
   VISIBILITY CHANGE
========================================================= */

/*
   VERY IMPORTANT:

   Tidak ada audio.pause() di sini.

   Tidak ada audio.load().

   Tidak ada audio.src reset.

   Ketika iPhone mengunci layar,
   browser boleh mengubah visibility,
   tetapi audio tidak disentuh.
*/

document.addEventListener(
  "visibilitychange",
  () => {

    if(
      document.visibilityState ===
      "visible"
    ){

      /*
         Tidak memanggil audio.play()
         secara otomatis.

         Kalau iOS memang mempertahankan
         playback, audio akan tetap berjalan.

         Kalau sistem sempat menghentikannya,
         kita tidak memaksa play karena
         autoplay restriction.
      */

      render();

    }

  }
);


/* =========================================================
   PAGE HIDE
========================================================= */

/*
   JANGAN PAUSE AUDIO.

   Ini sengaja kosong.
*/

window.addEventListener(
  "pagehide",
  () => {

    /*
       Do nothing.

       Jangan:
       audio.pause()
       audio.load()
       audio.src = ""
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

$("bar").oninput =
  () => {

    if(
      songs[current]?.type ===
      "yt" &&
      yt
    ){

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

    }

  };


/* =========================================================
   PLAY BUTTON
========================================================= */

$("play").onclick =
  () => {

    if(
      current < 0
    ){

      if(songs.length)
        playSong(0);

      return;

    }


    const song =
      songs[current];


    if(
      song.type === "yt"
    ){

      if(!yt)
        return;


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


      return;

    }


    /*
       LOCAL

       Native audio.
    */

    if(
      audio.paused
    ){

      audio.play()
        .catch(()=>{});

    }else{

      audio.pause();

    }

  };


/* =========================================================
   NEXT BUTTON
========================================================= */

$("next").onclick =
  nextSong;


/* =========================================================
   PREVIOUS BUTTON
========================================================= */

$("prev").onclick =
  previousSong;


function previousSong(){

  if(!songs.length)
    return;


  /*
     Jika sudah lebih dari 3 detik,
     kembali ke awal lagu.
  */

  if(
    songs[current]?.type ===
    "local" &&
    audio.currentTime > 3
  ){

    audio.currentTime = 0;

    return;

  }


  const i =
    current <= 0
    ?
    songs.length - 1
    :
    current - 1;


  playSong(i);

}


/* =========================================================
   SHUFFLE
========================================================= */

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


/* =========================================================
   REPEAT
========================================================= */

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


/* =========================================================
   ADD PANEL
========================================================= */

$("addBtn").onclick =
  () => {

    $("panel")
      .classList.toggle(
        "open"
      );

  };


/* =========================================================
   NEXT SONG
========================================================= */

function nextSong(){

  if(!songs.length)
    return;


  let i;


  if(shuffle){

    if(
      songs.length === 1
    ){

      i = current;

    }else{

      do{

        i =
          Math.floor(
            Math.random() *
            songs.length
          );

      }while(
        i === current
      );

    }

  }else{

    i =
      current + 1;


    if(
      i >= songs.length
    ){

      if(repeat){

        i = 0;

      }else{

        /*
           Tetap pada lagu terakhir.
        */

        i =
          songs.length - 1;

        return;

      }

    }

  }


  playSong(i);

}


/* =========================================================
   LOCAL FILE IMPORT
========================================================= */

$("files").onchange =
  async e => {

    const files =
      Array.from(
        e.target.files || []
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


    e.target.value =
      "";

  };


/* =========================================================
   SEARCH CACHE
========================================================= */

function getCache(key){

  return new Promise(resolve=>{

    const r =
      db
        .transaction(
          "searchCache"
        )
        .objectStore(
          "searchCache"
        )
        .get(key);


    r.onsuccess =
      () => {

        const x =
          r.result;


        if(!x){

          resolve(null);

          return;

        }


        const age =
          Date.now() -
          x.time;


        if(
          age >
          86400000
        ){

          deleteCache(key);

          resolve(null);

        }else{

          resolve(
            x.data
          );

        }

      };


    r.onerror =
      () => {

        resolve(null);

      };

  });

}


/* =========================================================
   SAVE CACHE
========================================================= */

function saveCache(
  key,
  data
){

  return new Promise(resolve=>{

    const t =
      db.transaction(
        "searchCache",
        "readwrite"
      );


    t.objectStore(
      "searchCache"
    ).put({

      key:
        key,

      time:
        Date.now(),

      data:
        data

    });


    t.oncomplete =
      resolve;

  });

}


/* =========================================================
   DELETE CACHE
========================================================= */

function deleteCache(key){

  const t =
    db.transaction(
      "searchCache",
      "readwrite"
    );


  t.objectStore(
    "searchCache"
  ).delete(key);

}


/* =========================================================
   YOUTUBE SEARCH
========================================================= */

async function search(){

  const q =
    $("query")
      .value
      .trim();


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


    const u =
      new URL(
        "https://www.googleapis.com/youtube/v3/search"
      );


    u.searchParams.set(
      "part",
      "snippet"
    );


    u.searchParams.set(
      "type",
      "video"
    );


    u.searchParams.set(
      "maxResults",
      "10"
    );


    u.searchParams.set(
      "q",
      q
    );


    u.searchParams.set(
      "key",
      YOUTUBE_API_KEY
    );


    const response =
      await fetch(u);


    if(!response.ok){

      throw new Error(
        "HTTP " +
        response.status
      );

    }


    const data =
      await response.json();


    const results =
      data.items.map(
        x => ({

          id:
            "yt_" +
            x.id.videoId,

          type:
            "yt",

          videoId:
            x.id.videoId,

          title:
            x.snippet.title,

          artist:
            x.snippet.channelTitle,

          thumb:
            x.snippet
              .thumbnails
              .medium
              .url,

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


  }catch(e){

    console.error(e);


    $("results").innerHTML =
      "❌ Gagal: " +
      esc(e.message);

  }

}


/* =========================================================
   CLOSE RESULTS
========================================================= */

function closeResults(){

  $("results").innerHTML =
    "";

}


/* =========================================================
   SHOW RESULTS
========================================================= */

function showResults(
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


  $("closeResults")
    .onclick =
    closeResults;


  results.forEach(
    song => {

      const d =
        document.createElement(
          "div"
        );


      d.className =
        "result";


      d.innerHTML = `

        <img
          src="${esc(song.thumb)}"
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


      d.querySelector(".p")
        .onclick =
        () => {

          playYT(song);

          closeResults();

        };


      d.querySelector(".a")
        .onclick =
        async () => {

          await saveSong(
            song
          );


          songs =
            await getSongs();


          render();


          closeResults();

        };


      $("results")
        .appendChild(
          d
        );

    }
  );

}


/* =========================================================
   SEARCH BUTTON
========================================================= */

$("searchBtn").onclick =
  search;


$("query").onkeydown =
  e => {

    if(
      e.key ===
      "Enter"
    ){

      search();

    }

  };


/* =========================================================
   YOUTUBE
========================================================= */

window.onYouTubeIframeAPIReady =
  () => {

    ytReady = true;


    if(pending){

      createYT(
        pending
      );


      pending = null;

    }

  };


/* =========================================================
   PLAY YOUTUBE
========================================================= */

function playYT(song){

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
    `<img src="${esc(song.thumb)}">`
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

    yt.loadVideoById(
      song.videoId
    );

  }else{

    createYT(
      song
    );

  }

}


/* =========================================================
   CREATE YOUTUBE
========================================================= */

function createYT(song){

  yt =
    new YT.Player(
      "youtubePlayer",
      {

        width:"1",
        height:"1",

        videoId:
          song.videoId,

        playerVars:{
          autoplay:1,
          playsinline:1,
          controls:0,
          rel:0
        },

        events:{

          onReady:e => {

            e.target.playVideo();

            startYTTimer();

          },


          onStateChange:e => {

            if(
              e.data ===
              YT.PlayerState.PLAYING
            ){

              $("play").textContent =
                "⏸";


              vinylPlay();


              startYTTimer();


            }else if(
              e.data ===
              YT.PlayerState.PAUSED
            ){

              $("play").textContent =
                "▶";


              vinylPause();


              stopYTTimer();


            }else if(
              e.data ===
              YT.PlayerState.ENDED
            ){

              vinylPause();


              stopYTTimer();


              nextSong();

            }

          },


          onError:e => {

            $("status").textContent =
              "YouTube Error";


            vinylPause();


            console.log(
              "YouTube error:",
              e.data
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

          const cur =
            yt.getCurrentTime();


          const dur =
            yt.getDuration();


          if(
            dur > 0
          ){

            $("cur").textContent =
              time(cur);


            $("dur").textContent =
              time(dur);


            $("bar").value =
              (
                cur /
                dur
              ) * 100;

          }

        }catch(e){}

      },
      500
    );

}


function stopYTTimer(){

  if(ytTimer){

    clearInterval(
      ytTimer
    );

    ytTimer = null;

  }

}


/* =========================================================
   STOP YOUTUBE
========================================================= */

function stopYT(){

  stopYTTimer();


  if(yt){

    try{

      yt.stopVideo();

    }catch(e){}

  }

}


/* =========================================================
   CLEAR LIBRARY
========================================================= */

$("clear").onclick =
  async () => {

    if(
      !confirm(
        "Hapus semua lagu?"
      )
    )
      return;


    const t =
      db.transaction(
        "songs",
        "readwrite"
      );


    t.objectStore(
      "songs"
    ).clear();


    t.oncomplete =
      () => {

        songs = [];

        current = -1;


        stopYT();


        audio.pause();


        vinylPause();


        if(url){

          try{

            URL.revokeObjectURL(
              url
            );

          }catch(e){}

          url = null;

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
