if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');

let db; indexedDB.open("musikkuPro",1).onupgradeneeded=e=>{db=e.target.result;db.createObjectStore("songs",{keyPath:"id",autoIncrement:true})};
indexedDB.open("musikkuPro",1).onsuccess=e=>{db=e.target.result;load()};

const audio=document.getElementById("audio"), file=document.getElementById("file");
const playBtn=document.getElementById("play"), prevBtn=document.getElementById("prev"), nextBtn=document.getElementById("next");
const repeatBtn=document.getElementById("repeat"), progress=document.getElementById("progress");
const list=document.getElementById("list"), titleEl=document.getElementById("title"), artistEl=document.getElementById("artist");
const currentEl=document.getElementById("current"), durationEl=document.getElementById("duration");

let songs=[], i=0, isRepeat=false;

// PILIH FILE - FIX IPHONE
file.onchange=async e=>{
  for(let f of e.target.files){
    const buf=await f.arrayBuffer();
    db.transaction("songs","readwrite").objectStore("songs").add({name:f.name,data:buf});
  }
  setTimeout(load,800);
}

// LOAD
function load(){
  db.transaction("songs").objectStore("songs").getAll().onsuccess=e=>{
    songs=e.target.result.map(s=>({id:s.id,title:s.name,url:URL.createObjectURL(new Blob([s.data]))}));
    render();
    if(songs.length&&audio.paused) playSong(0);
  }
}

// RENDER PLAYLIST
function render(){
  list.innerHTML="";
  songs.forEach((s,idx)=>{
    const li=document.createElement("li");
    li.innerHTML=`<span>${s.title}</span>`;
    if(idx===i)li.classList.add("active");
    li.onclick=()=>playSong(idx);
    list.appendChild(li);
  })
}

// PLAY
function playSong(idx){
  i=idx; const s=songs[i];
  audio.src=s.url; titleEl.textContent=s.title; artistEl.textContent="Local";
  audio.load(); 
  audio.play().catch(()=>{}); // iPhone butuh tap
  updateMedia(s); render();
}

// MEDIA SESSION - BIAR JALAN SAAT LAYAR MATI
function updateMedia(s){
  if('mediaSession' in navigator){
    navigator.mediaSession.metadata=new MediaMetadata({title:s.title,artist:"Local",artwork:[{src:'./icon-512.png',sizes:'512x512'}]});
    navigator.mediaSession.setActionHandler('play',()=>audio.play());
    navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
    navigator.mediaSession.setActionHandler('nexttrack',()=>nextBtn.click());
    navigator.mediaSession.setActionHandler('previoustrack',()=>prevBtn.click());
  }
}

// KONTROL
playBtn.onclick=()=>audio.paused?audio.play():audio.pause();
audio.onplay=()=>playBtn.textContent="⏸️"; audio.onpause=()=>playBtn.textContent="▶️";
nextBtn.onclick=()=>{i=(i+1)%songs.length;playSong(i)};
prevBtn.onclick=()=>{i=(i-1+songs.length)%songs.length;playSong(i)};
repeatBtn.onclick=()=>{isRepeat=!isRepeat;repeatBtn.style.color=isRepeat?"#1DB954":"#fff"};
audio.onended=()=>isRepeat?audio.play():nextBtn.click();

// PROGRESS + TIME
audio.ontimeupdate=()=>{
  if(audio.duration){
    progress.value=(audio.currentTime/audio.duration)*100;
    currentEl.textContent=formatTime(audio.currentTime);
    durationEl.textContent=formatTime(audio.duration);
  }
}
progress.oninput=()=>{if(audio.duration)audio.currentTime=(progress.value/100)*audio.duration};
function formatTime(s){let m=Math.floor(s/60),sec=Math.floor(s%60);return`${m}:${sec<10?'0':''}${sec}`}

// JAGA SUARA IPHONE
setInterval(()=>{if(!audio.paused)audio.volume=1},2000);
