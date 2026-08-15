console.log("Musik Offline V3 Loaded");

// DAFTAR SERVICE WORKER
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js');
}

// DB BUAT NYIMPEN LAGU
let db;
indexedDB.open("MusikOfflineDB", 1).onupgradeneeded = e => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("songs")) db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
};
indexedDB.open("MusikOfflineDB", 1).onsuccess = e => { db = e.target.result; loadPlaylist(); };

// ELEMENTS
const audio = document.getElementById("audioPlayer");
const addSongBtn = document.getElementById("addSongBtn");
const fileInput = document.getElementById("fileInput");
const playBtn = document.getElementById("playBtn");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const progressBar = document.getElementById("progressBar");
const playlistEl = document.getElementById("playlist");
const songTitle = document.getElementById("songTitle");
const songArtist = document.getElementById("songArtist");
const coverArt = document.getElementById("coverArt");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

let playlist = []; let currentIndex = -1;
let audioContext;

// VISUALIZER
function initVisualizer() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaElementSource(audio);
  const analyser = audioContext.createAnalyser();
  source.connect(analyser); analyser.connect(audioContext.destination);
  analyser.fftSize = 256;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const barWidth = canvas.width / dataArray.length;
    let x=0; for(let i=0;i<dataArray.length;i++){
      const h = (dataArray[i]/255)*canvas.height;
      ctx.fillStyle="#1DB954"; ctx.fillRect(x,canvas.height-h,barWidth-1,h); x+=barWidth;
    }
  } draw();
}

// SAVE & LOAD
function saveSong(file){
  const reader = new FileReader();
  reader.onload = () => {
    db.transaction("songs","readwrite").objectStore("songs").add({
      title: file.name.replace(/\.[^/.]+$/,""), artist:"Local Music", blob:reader.result
    });
  };
  reader.readAsArrayBuffer(file);
}
function loadPlaylist(){
  db.transaction("songs","readonly").objectStore("songs").getAll().onsuccess = e => {
    playlist = e.target.result.map(s => ({
      id:s.id, title:s.title, artist:s.artist, url:URL.createObjectURL(new Blob([s.blob]))
    }));
    updatePlaylist(); if(playlist.length>0 && currentIndex===-1) playTrack(0);
  };
}

// UI
function updatePlaylist(){
  playlistEl.innerHTML="";
  playlist.forEach((t,i)=>{
    const li=document.createElement("li"); li.textContent=t.title;
    if(i===currentIndex) li.classList.add("active");
    li.onclick=()=>playTrack(i); playlistEl.appendChild(li);
  });
}

// PLAY
function playTrack(i){
  if(!playlist[i]) return; currentIndex=i; const t=playlist[i];
  audio.src=t.url; songTitle.textContent=t.title; songArtist.textContent=t.artist;
  initVisualizer(); updateMediaSession(t); audio.play();
  if(audioContext.state==='suspended') audioContext.resume();
}
function updateMediaSession(t){
  if(!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,artwork:[{src:'./icon-512.png',sizes:'512x512'}]});
  navigator.mediaSession.setActionHandler('play',()=>audio.play());
  navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack',()=>prevBtn.click());
  navigator.mediaSession.setActionHandler('nexttrack',()=>nextBtn.click());
}

// EVENTS
addSongBtn.onclick=()=>fileInput.click();
fileInput.onchange=e=>{ Array.from(e.target.files).forEach(saveSong); setTimeout(loadPlaylist,500); };
playBtn.onclick=()=>audio.paused?audio.play():audio.pause();
audio.onplay=()=>playBtn.textContent="⏸️"; audio.onpause=()=>playBtn.textContent="▶️";
nextBtn.onclick=()=>{currentIndex=(currentIndex+1)%playlist.length;playTrack(currentIndex)};
prevBtn.onclick=()=>{currentIndex=(currentIndex-1+playlist.length)%playlist.length;playTrack(currentIndex)};
audio.onended=()=>nextBtn.click();
audio.ontimeupdate=()=>{if(audio.duration)progressBar.value=(audio.currentTime/audio.duration)*100};
progressBar.oninput=()=>{if(audio.duration)audio.currentTime=(progressBar.value/100)*audio.duration};
setInterval(()=>{if(!audio.paused)audio.volume=1.0},1000); // JAGA SUARA
