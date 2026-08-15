// KHUSUS IPHONE FIX
if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');

let db;
indexedDB.open("musikku",1).onupgradeneeded=e=>{db=e.target.result;db.createObjectStore("songs",{keyPath:"id",autoIncrement:true})};
indexedDB.open("musikku",1).onsuccess=e=>{db=e.target.result;load()};

const audio=document.getElementById("audio");
const file=document.getElementById("file");
const play=document.getElementById("play");
const prev=document.getElementById("prev");
const next=document.getElementById("next");
const list=document.getElementById("list");
const title=document.getElementById("title");

let songs=[]; let i=-1;

// FIX 1: BIAR FILE PICKER KEBUKA DI IPHONE
file.addEventListener('change', e=>{
  if(!e.target.files.length) return;
  [...e.target.files].forEach(f=>{
    const r=new FileReader();
    r.onload=()=>db.transaction("songs","readwrite").objectStore("songs").add({name:f.name,data:r.result});
    r.readAsArrayBuffer(f);
  });
  setTimeout(load,1000);
}, false);

function load(){
  db.transaction("songs").objectStore("songs").getAll().onsuccess=e=>{
    songs=e.target.result.map(s=>({id:s.id,title:s.name,url:URL.createObjectURL(new Blob([s.data]))}));
    render();
  }
}

function render(){
  list.innerHTML="";
  songs.forEach((s,idx)=>{
    const li=document.createElement("li");
    li.textContent=s.title;
    if(idx===i)li.classList.add("active");
    li.onclick=()=>playSong(idx);
    list.appendChild(li);
  })
}

// FIX 2: IPHONE WAJIB RESUME AUDIOCONTEXT PAS DI TAP
function playSong(idx){
  i=idx; const s=songs[i];
  audio.src=s.url;
  title.textContent=s.title;
  audio.load(); // penting buat iOS
  audio.play().catch(()=>alert("Pencet Play lagi ya"));
  updateMedia(s);
  render();
}

function updateMedia(s){
  if('mediaSession' in navigator){
    navigator.mediaSession.metadata=new MediaMetadata({title:s.title,artist:"Lokal"});
    navigator.mediaSession.setActionHandler('play',()=>audio.play());
    navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
    navigator.mediaSession.setActionHandler('nexttrack',()=>next.click());
    navigator.mediaSession.setActionHandler('previoustrack',()=>prev.click());
  }
}

// FIX 3: TOMBOL PLAY HARUS DI TAP USER DULU
play.onclick=()=>{
  audio.paused?audio.play():audio.pause();
}

audio.onplay=()=>play.textContent="⏸️";
audio.onpause=()=>play.textContent="▶️";
next.onclick=()=>{i=(i+1)%songs.length;playSong(i)};
prev.onclick=()=>{i=(i-1+songs.length)%songs.length;playSong(i)};
audio.onended=()=>next.click();
setInterval(()=>{if(!audio.paused)audio.volume=1},1000);
