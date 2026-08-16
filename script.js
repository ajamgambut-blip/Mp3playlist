const YOUTUBE_API_KEY="AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c";

const $=id=>document.getElementById(id);
const audio=$("audio");
const playlist=$("playlist");

let songs=[],current=-1,yt=null,ytReady=false;
let pending=null,shuffle=false,repeat=false,url=null;
let ytTimer=null;

const DB="MyMusicDB";
const VERSION=2;

let db;

/* DATABASE */

function openDB(){
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,VERSION);

  r.onupgradeneeded=e=>{
   const d=e.target.result;

   if(!d.objectStoreNames.contains("songs"))
    d.createObjectStore("songs",{keyPath:"id"});

   if(!d.objectStoreNames.contains("searchCache"))
    d.createObjectStore("searchCache",{keyPath:"key"});
  };

  r.onsuccess=e=>{
   db=e.target.result;
   resolve();
  };

  r.onerror=()=>reject(r.error);
 });

}

function getSongs(){
 return new Promise(resolve=>{
  const r=db.transaction("songs")
   .objectStore("songs").getAll();

  r.onsuccess=()=>resolve(r.result||[]);
 });

}

function saveSong(x){
 return new Promise(resolve=>{
  const t=db.transaction("songs","readwrite");
  t.objectStore("songs").put(x);
  t.oncomplete=resolve;
 });
}

function removeSong(id){
 return new Promise(resolve=>{
  const t=db.transaction("songs","readwrite");
  t.objectStore("songs").delete(id);
  t.oncomplete=resolve;
 });
}


/* HELPERS */

function time(s){
 if(!isFinite(s)||s<0)return"0:00";

 return Math.floor(s/60)+":"+
 String(Math.floor(s%60)).padStart(2,"0");
}

function esc(x){
 return String(x||"").replace(/[&<>"']/g,m=>({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#039;"
 }[m]));
}


/* LIBRARY */

function render(){

 playlist.innerHTML="";
 $("count").textContent=songs.length+" lagu";

 if(!songs.length){
  playlist.innerHTML=
   '<div class="empty">Belum ada musik</div>';
  return;
 }

 songs.forEach((s,i)=>{

  const d=document.createElement("div");

  d.className=
   "song"+(i===current?" current":"");

  d.innerHTML=`
   <div class="sc">
    ${s.thumb?
     `<img src="${s.thumb}">`:"♪"}
   </div>

   <div class="si">
    <b>${esc(s.title)}</b>

    <small>
     ${s.type==="yt"?"▶ YouTube":"📁 Lokal"}
     · ${esc(s.artist)}
     ${s.duration?
      " · "+time(s.duration):""}
    </small>
   </div>

   <button class="del">×</button>
  `;

  d.onclick=e=>{
   if(e.target.closest(".del"))return;
   playSong(i);
  };

  d.querySelector(".del").onclick=async e=>{
   e.stopPropagation();

   await removeSong(s.id);
   songs=await getSongs();

   render();
  };

  playlist.appendChild(d);
 });
}


/* PLAY */

function playSong(i){

 if(!songs[i])return;

 current=i;

 const s=songs[i];

 render();

 $("title").textContent=s.title;
 $("artist").textContent=s.artist;

 if(s.type==="yt"){

  audio.pause();
  playYT(s);

 }else{

  stopYT();

  if(url)URL.revokeObjectURL(url);

  url=URL.createObjectURL(s.blob);

  audio.src=url;

  $("cover").innerHTML="♪";
  $("status").textContent="Local Music";

  $("bar").value=0;
  $("cur").textContent="0:00";

  audio.play().catch(()=>{});
 }
}


/* LOCAL */

audio.onloadedmetadata=()=>{
 $("dur").textContent=time(audio.duration);
};

audio.ontimeupdate=()=>{

 if(!audio.duration)return;

 $("bar").value=
  audio.currentTime/audio.duration*100;

 $("cur").textContent=
  time(audio.currentTime);
};

audio.onplay=()=>{
 $("play").textContent="⏸";
};

audio.onpause=()=>{
 $("play").textContent="▶";
};

audio.onended=nextSong;


/* YOUTUBE */

window.onYouTubeIframeAPIReady=()=>{

 ytReady=true;

 if(pending){
  createYT(pending);
  pending=null;
 }
};

function playYT(song){

 $("title").textContent=song.title;
 $("artist").textContent=song.artist;
 $("status").textContent="YouTube Online";

 $("cover").innerHTML=
  song.thumb?
  `<img src="${song.thumb}">`:"▶";

 $("cur").textContent="0:00";
 $("dur").textContent="0:00";
 $("bar").value=0;

 if(!ytReady){
  pending=song;
  return;
 }

 if(yt){

  yt.loadVideoById(song.videoId);

 }else{

  createYT(song);
 }
}

function createYT(song){

 yt=new YT.Player("youtubePlayer",{

  width:"1",
  height:"1",

  videoId:song.videoId,

  playerVars:{
   autoplay:1,
   playsinline:1,
   controls:0,
   rel:0
  },

  events:{

   onReady:e=>{
    e.target.playVideo();
    startYTTimer();
   },

   onStateChange:e=>{

    if(e.data===YT.PlayerState.PLAYING){

     $("play").textContent="⏸";
     startYTTimer();

    }else if(e.data===YT.PlayerState.PAUSED){

     $("play").textContent="▶";
     stopYTTimer();

    }else if(e.data===YT.PlayerState.ENDED){

     stopYTTimer();
     nextSong();
    }
   },

   onError:e=>{
    $("status").textContent="YouTube Error";
    console.log("YouTube error:",e.data);
   }
  }
 });
}


/* YOUTUBE PROGRESS */

function startYTTimer(){

 stopYTTimer();

 ytTimer=setInterval(()=>{

  if(!yt)return;

  try{

   const cur=yt.getCurrentTime();
   const dur=yt.getDuration();

   if(dur>0){

    $("cur").textContent=time(cur);
    $("dur").textContent=time(dur);

    $("bar").value=cur/dur*100;
   }

  }catch(e){}

 },500);
}

function stopYTTimer(){

 if(ytTimer){
  clearInterval(ytTimer);
  ytTimer=null;
 }
}

$("bar").oninput=()=>{

 if(
  songs[current]?.type==="yt" &&
  yt
 ){

  const dur=yt.getDuration();

  if(dur){

   yt.seekTo(
    $("bar").value/100*dur,
    true
   );
  }

 }else if(audio.duration){

  audio.currentTime=
   $("bar").value/100*
   audio.duration;
 }
};

function stopYT(){

 stopYTTimer();

 if(yt){
  try{yt.stopVideo()}catch(e){}
 }
}


/* CONTROLS */

$("play").onclick=()=>{

 if(current<0){

  if(songs.length)playSong(0);
  return;
 }

 const s=songs[current];

 if(s.type==="yt"){

  if(!yt)return;

  const state=yt.getPlayerState();

  if(state===YT.PlayerState.PLAYING)
   yt.pauseVideo();
  else
   yt.playVideo();

 }else{

  audio.paused?
   audio.play():
   audio.pause();
 }
};

function nextSong(){

 if(!songs.length)return;

 let i;

 if(shuffle){

  i=Math.floor(Math.random()*songs.length);

 }else{

  i=current+1;

  if(i>=songs.length)
   i=repeat?0:songs.length-1;
 }

 playSong(i);
}

$("next").onclick=nextSong;

$("prev").onclick=()=>{

 if(!songs.length)return;

 playSong(
  current<=0?
  songs.length-1:
  current-1
 );
};

$("shuffle").onclick=()=>{
 shuffle=!shuffle;
 $("shuffle").classList.toggle("on",shuffle);
};

$("repeat").onclick=()=>{
 repeat=!repeat;
 $("repeat").classList.toggle("on",repeat);
};

$("addBtn").onclick=()=>{
 $("panel").classList.toggle("open");
};


/* LOCAL FILE */

$("files").onchange=async e=>{

 for(const f of e.target.files){

  await saveSong({

   id:crypto.randomUUID(),

   type:"local",

   title:f.name.replace(/\.[^/.]+$/,""),

   artist:"Local File",

   blob:f
  });
 }

 songs=await getSongs();
 render();

 e.target.value="";
};


/* SEARCH CACHE */

function getCache(key){

 return new Promise(resolve=>{

  const r=db.transaction("searchCache")
   .objectStore("searchCache")
   .get(key);

  r.onsuccess=()=>{

   const x=r.result;

   if(!x){
    resolve(null);
    return;
   }

   const age=Date.now()-x.time;

   if(age>86400000){

    deleteCache(key);
    resolve(null);

   }else{

    resolve(x.data);
   }
  };

  r.onerror=()=>resolve(null);
 });
}

function saveCache(key,data){

 return new Promise(resolve=>{

  const t=db.transaction(
   "searchCache","readwrite"
  );

  t.objectStore("searchCache").put({
   key:key,
   time:Date.now(),
   data:data
  });

  t.oncomplete=resolve;
 });
}

function deleteCache(key){

 const t=db.transaction(
  "searchCache","readwrite"
 );

 t.objectStore("searchCache").delete(key);
}


/* YOUTUBE SEARCH */

async function search(){

 const q=$("query").value.trim();

 if(!q)return;

 $("results").innerHTML="🔎 Mencari...";

 const key=q.toLowerCase();

 try{

  /* CEK CACHE */

  const cached=await getCache(key);

  if(cached){

   $("results").innerHTML=
    '<small style="color:#777">⚡ Dari cache</small>';

   showResults(cached);

   return;
  }

  if(
   !YOUTUBE_API_KEY ||
   YOUTUBE_API_KEY==="ISI_API_KEY_KAMU"
  ){

   $("results").innerHTML=
    "❌ API key belum diisi.";

   return;
  }

  /* HANYA 1 REQUEST API */

  const u=new URL(
   "https://www.googleapis.com/youtube/v3/search"
  );

  u.searchParams.set("part","snippet");
  u.searchParams.set("type","video");
  u.searchParams.set("maxResults","10");
  u.searchParams.set("q",q);
  u.searchParams.set("key",YOUTUBE_API_KEY);

  const r=await fetch(u);

  if(!r.ok)
   throw new Error("HTTP "+r.status);

  const data=await r.json();

  const results=data.items.map(x=>({

   id:"yt_"+x.id.videoId,

   type:"yt",

   videoId:x.id.videoId,

   title:x.snippet.title,

   artist:x.snippet.channelTitle,

   thumb:x.snippet.thumbnails.medium.url,

   duration:0
  }));

  await saveCache(key,results);

  showResults(results);

 }catch(e){

  console.error(e);

  $("results").innerHTML=
   "❌ Gagal: "+esc(e.message);
 }
}


/* SHOW RESULTS */
function closeResults(){
    $("results").innerHTML="";
}

function showResults(results){

    $("results").innerHTML=`
        <div class="result-head">
            <span>Hasil YouTube</span>
            <button id="closeResults">✕</button>
        </div>
    `;

    $("closeResults").onclick=closeResults;

    results.forEach(song=>{

        const d=document.createElement("div");

        d.className="result";

        d.innerHTML=`
            <img src="${song.thumb}">

            <div class="ri">

                <b>${esc(song.title)}</b>

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

        /* PLAY */

        d.querySelector(".p").onclick=()=>{

            playYT(song);

            closeResults();

        };

        /* PLAYLIST */

        d.querySelector(".a").onclick=async()=>{

            await saveSong(song);

            songs=await getSongs();

            render();

            closeResults();

        };

        $("results").appendChild(d);
    });
}


/* SEARCH */

$("searchBtn").onclick=search;

$("query").onkeydown=e=>{
 if(e.key==="Enter")search();
};


/* CLEAR */

$("clear").onclick=async()=>{

 if(!confirm("Hapus semua lagu?"))
  return;

 const t=db.transaction(
  "songs","readwrite"
 );

 t.objectStore("songs").clear();

 t.oncomplete=()=>{

  songs=[];
  current=-1;

  stopYT();
  audio.pause();

  render();

  $("title").textContent=
   "Belum ada lagu";

  $("artist").textContent=
   "Tambahkan musik untuk mulai";

  $("cur").textContent="0:00";
  $("dur").textContent="0:00";
  $("bar").value=0;
 };
};


/* START */

openDB().then(async()=>{

 songs=await getSongs();

 render();

 $("status").textContent="Ready";
});
