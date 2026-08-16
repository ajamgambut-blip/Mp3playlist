const YOUTUBE_API_KEY="AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c";

const $=id=>document.getElementById(id);
const audio=$("audio"),playlist=$("playlist");
let songs=[],current=-1,yt=null,ytReady=false,shuffle=false,repeat=false,url=null;

const DB="MyMusicDB",STORE="songs";
let db;

function openDB(){
 return new Promise((res,rej)=>{
  let r=indexedDB.open(DB,1);
  r.onupgradeneeded=e=>e.target.result.createObjectStore(STORE,{keyPath:"id"});
  r.onsuccess=e=>{db=e.target.result;res()};
  r.onerror=()=>rej(r.error);
 });
}

function getSongs(){
 return new Promise(res=>{
  let r=db.transaction(STORE).objectStore(STORE).getAll();
  r.onsuccess=()=>res(r.result||[]);
 });
}

function save(x){
 return new Promise(res=>{
  let t=db.transaction(STORE,"readwrite");
  t.objectStore(STORE).put(x);
  t.oncomplete=res;
 });
}

function remove(id){
 return new Promise(res=>{
  let t=db.transaction(STORE,"readwrite");
  t.objectStore(STORE).delete(id);
  t.oncomplete=res;
 });
}

function time(s){
 if(!isFinite(s))return"0:00";
 return Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");
}

function esc(x){
 return String(x||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function render(){
 playlist.innerHTML="";
 $("count").textContent=songs.length+" lagu";

 if(!songs.length){
  playlist.innerHTML='<div class="empty">Belum ada musik</div>';
  return;
 }

 songs.forEach((s,i)=>{
  let d=document.createElement("div");
  d.className="song"+(i===current?" current":"");

  d.innerHTML=`
   <div class="sc">${s.thumb?`<img src="${s.thumb}">`:"♪"}</div>
   <div class="si">
    <b>${esc(s.title)}</b>
    <small>${s.type==="yt"?"▶ YouTube":"📁 Lokal"} · ${esc(s.artist)}</small>
   </div>
   <button class="del">×</button>`;

  d.onclick=e=>{
   if(e.target.closest(".del"))return;
   playSong(i);
  };

  d.querySelector(".del").onclick=async e=>{
   e.stopPropagation();
   await remove(s.id);
   songs=await getSongs();
   render();
  };

  playlist.appendChild(d);
 });
}

async function playSong(i){
 if(!songs[i])return;
 current=i;
 let s=songs[i];
 render();

 $("title").textContent=s.title;
 $("artist").textContent=s.artist;

 if(s.type==="local"){
  if(url)URL.revokeObjectURL(url);
  url=URL.createObjectURL(s.blob);

  if(yt)yt.stopVideo();

  audio.src=url;
  audio.play().catch(()=>{});
  $("status").textContent="Local Music";
  $("cover").innerHTML="♪";
 }else{
  audio.pause();
  playYT(s);
 }
}

function playYT(s){
 $("title").textContent=s.title;
 $("artist").textContent=s.artist;
 $("status").textContent="YouTube Online";
 $("cover").innerHTML=s.thumb?`<img src="${s.thumb}">`:"▶";

 if(!ytReady){
  window.pending=s;
  return;
 }

 if(yt)yt.loadVideoById(s.videoId);
 else createYT(s.videoId);
}

function createYT(id){
 yt=new YT.Player("youtubePlayer",{
  width:"1",
  height:"1",
  videoId:id,
  playerVars:{autoplay:1,playsinline:1,controls:0,rel:0},
  events:{
   onReady:e=>e.target.playVideo(),
   onStateChange:e=>{
    if(e.data===YT.PlayerState.PLAYING)$("play").textContent="⏸";
    if(e.data===YT.PlayerState.PAUSED)$("play").textContent="▶";
    if(e.data===YT.PlayerState.ENDED)nextSong();
   }
  }
 });
}

window.onYouTubeIframeAPIReady=()=>{
 ytReady=true;
 if(window.pending){
  createYT(window.pending.videoId);
  window.pending=null;
 }
};

$("play").onclick=()=>{
 if(current<0){
  if(songs.length)playSong(0);
  return;
 }

 let s=songs[current];

 if(s.type==="yt"){
  if(!yt)return;
  let state=yt.getPlayerState();
  state===YT.PlayerState.PLAYING?yt.pauseVideo():yt.playVideo();
 }else{
  audio.paused?audio.play():audio.pause();
 }
};

function nextSong(){
 if(!songs.length)return;
 let i=shuffle?Math.floor(Math.random()*songs.length):current+1;
 if(i>=songs.length)i=repeat?0:songs.length-1;
 playSong(i);
}

$("next").onclick=nextSong;

$("prev").onclick=()=>{
 if(!songs.length)return;
 playSong(current<=0?songs.length-1:current-1);
};

$("shuffle").onclick=()=>{
 shuffle=!shuffle;
 $("shuffle").classList.toggle("on",shuffle);
};

$("repeat").onclick=()=>{
 repeat=!repeat;
 $("repeat").classList.toggle("on",repeat);
};

audio.ontimeupdate=()=>{
 if(!audio.duration)return;
 $("bar").value=audio.currentTime/audio.duration*100;
 $("cur").textContent=time(audio.currentTime);
};

audio.onloadedmetadata=()=>{
 $("dur").textContent=time(audio.duration);
};

audio.onplay=()=>$("play").textContent="⏸";
audio.onpause=()=>$("play").textContent="▶";
audio.onended=nextSong;

$("bar").oninput=()=>{
 if(audio.duration)
  audio.currentTime=$("bar").value/100*audio.duration;
};

$("addBtn").onclick=()=>$("panel").classList.toggle("open");

$("files").onchange=async e=>{
 for(let f of e.target.files){
  await save({
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

async function search(){
 let q=$("query").value.trim();
 if(!q)return;

 $("results").innerHTML="Mencari...";

 try{
  let u=new URL("https://www.googleapis.com/youtube/v3/search");
  u.searchParams.set("part","snippet");
  u.searchParams.set("type","video");
  u.searchParams.set("maxResults","10");
  u.searchParams.set("q",q);
  u.searchParams.set("key",YOUTUBE_API_KEY);

  let r=await fetch(u);
  if(!r.ok)throw new Error("HTTP "+r.status);

  let data=await r.json();

  $("results").innerHTML="";

  data.items.forEach(x=>{
   let id=x.id.videoId,s=x.snippet;
   let thumb=s.thumbnails.medium.url;

   let d=document.createElement("div");
   d.className="result";

   d.innerHTML=`
    <img src="${thumb}">
    <div class="ri">
     <b>${esc(s.title)}</b>
     <small>${esc(s.channelTitle)}</small>
     <button class="p">▶ Play</button>
     <button class="a">＋ Playlist</button>
    </div>`;

   d.querySelector(".p").onclick=()=>{
    playYT({
     type:"yt",
     videoId:id,
     title:s.title,
     artist:s.channelTitle,
     thumb
    });
   };

   d.querySelector(".a").onclick=async()=>{
    await save({
     id:"yt_"+id,
     type:"yt",
     videoId:id,
     title:s.title,
     artist:s.channelTitle,
     thumb
    });
    songs=await getSongs();
    render();
   };

   $("results").appendChild(d);
  });

 }catch(e){
  $("results").innerHTML="❌ Gagal: "+esc(e.message);
 }
}

$("searchBtn").onclick=search;
$("query").onkeydown=e=>{if(e.key==="Enter")search()};

$("clear").onclick=async()=>{
 if(!confirm("Hapus semua lagu?"))return;

 let t=db.transaction(STORE,"readwrite");
 t.objectStore(STORE).clear();

 t.oncomplete=async()=>{
  songs=[];
  current=-1;
  render();
 };
};

openDB().then(async()=>{
 songs=await getSongs();
 render();
 $("status").textContent="Ready";
});
