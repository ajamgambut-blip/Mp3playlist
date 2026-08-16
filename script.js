const audio = document.getElementById("audio");
const cover = document.getElementById("cover");
const bg = document.getElementById("bg");
let offlineSongs = JSON.parse(localStorage.getItem("offlineSongs")) || [];
let playlistSongs = JSON.parse(localStorage.getItem("playlistSongs")) || [];
let currentList = [], currentIndex = 0, isRepeat = false, isShuffle = false;
const API_KEY = "AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c"; // API KEY KAMU TETEP KEPAKE BUAT CARI

// VISUALIZER
const canvas = document.getElementById("visualizer"); const ctx = canvas.getContext("2d"); canvas.width=canvas.offsetWidth; canvas.height=60;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser(); const source = audioCtx.createMediaElementSource(audio);
source.connect(analyser); analyser.connect(audioCtx.destination); analyser.fftSize = 64;
function draw(){ requestAnimationFrame(draw); const data = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(data); ctx.clearRect(0,0,canvas.width,canvas.height);
const barWidth = canvas.width / data.length;
data.forEach((v,i)=>{ ctx.fillStyle = `hsl(${v*2},100%,60%)`; ctx.fillRect(i*barWidth, canvas.height-v/1.5, barWidth-2, v/1.5); }) }
draw();

// TABS
document.querySelectorAll(".tab-btn").forEach(btn=>btn.onclick=()=>{document.querySelectorAll(".tab-content").forEach(t=>t.style.display="none");document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));document.getElementById(btn.dataset.tab+"-tab").style.display="block";btn.classList.add("active")})

// OFFLINE - BISA MP3 MP4 WAV
document.getElementById("fileInput").onchange=e=>{[...e.target.files].forEach(file=>{const url=URL.createObjectURL(file);offlineSongs.push({name:file.name,type:"offline",url,cover:"icon-512.png",id:Date.now()+Math.random()})});save("offlineSongs",offlineSongs);loadList("offline")}
function loadList(type){const list=type==="offline"?offlineSongs:playlistSongs;const el=document.getElementById(type+"List");el.innerHTML="";list.forEach((s,i)=>{el.innerHTML+=`<div class="list-item"><img src="${s.cover}"><span onclick="play(${i},'${type}')">${s.name}</span>${type!=="playlist"?`<button onclick="addToPlaylist(${i})">➕</button>`:""}<button onclick="del(${i},'${type}')">🗑</button></div>`})}
window.del=(i,type)=>{if(type==="offline")offlineSongs.splice(i,1);if(type==="playlist")playlistSongs.splice(i,1);save(type+"Songs",eval(type+"Songs"));loadList(type)}

// CARI YOUTUBE - CUMA BUKA APP
document.getElementById("searchBtn").onclick=async()=>{let q=document.getElementById("searchInput").value;if(!q)return;document.getElementById("searchResult").innerHTML="Mencari...";let res=await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=10&key=${API_KEY}`);let data=await res.json();let l="";data.items.forEach((item)=>{l+=`<div class="list-item" onclick="window.open('https://youtube.com/watch?v=${item.id.videoId}', '_blank')"><img src="${item.snippet.thumbnails.default.url}"><span>${item.snippet.title}</span></div>`});document.getElementById("searchResult").innerHTML=l}

// PLAYLIST
window.addToPlaylist=(i)=>{const song=offlineSongs[i];if(!playlistSongs.find(s=>s.id===song.id)){playlistSongs.push(song);save("playlistSongs",playlistSongs);loadList("playlist");alert("Ditambah ke Playlist")}}
loadList("offline");loadList("playlist");

// PLAYER + BACKGROUND PLAY
function play(i,type){currentList=type==="offline"?offlineSongs:playlistSongs;currentIndex=i;const s=currentList[i];audio.src=s.url;document.getElementById("title").textContent=s.name;document.getElementById("artist").textContent="Offline";cover.src=s.cover;bg.style.background=`url(${s.cover}) center/cover`;audioCtx.state==="suspended"&&audioCtx.resume();audio.play();updateMedia(s)}
document.getElementById("play").onclick=()=>audio.paused?audio.play():audio.pause();
audio.onplay=()=>document.getElementById("play").textContent="⏸";audio.onpause=()=>document.getElementById("play").textContent="▶";
document.getElementById("repeat").onclick=()=>{isRepeat=!isRepeat;audio.loop=isRepeat;document.getElementById("repeat").style.color=isRepeat?"var(--green)":"#fff"}
document.getElementById("shuffle").onclick=()=>{isShuffle=!isShuffle;document.getElementById("shuffle").style.color=isShuffle?"var(--green)":"#fff"}
document.getElementById("next").onclick=()=>{currentIndex=isShuffle?Math.floor(Math.random()*currentList.length):(currentIndex+1)%currentList.length;play(currentIndex,currentList[currentIndex].type)}
document.getElementById("prev").onclick=()=>{currentIndex=(currentIndex-1+currentList.length)%currentList.length;play(currentIndex,currentList[currentIndex].type)}
audio.onended=()=>{if(!isRepeat)document.getElementById("next").click()}
audio.ontimeupdate=()=>{document.getElementById("progress").value=(audio.currentTime/audio.duration)*100||0;document.getElementById("current").textContent=fmt(audio.currentTime)}
audio.onloadedmetadata=()=>document.getElementById("duration").textContent=fmt(audio.duration);
document.getElementById("progress").oninput=e=>audio.currentTime=(e.target.value/100)*audio.duration;
function fmt(s){return Math.floor(s/60)+":"+(Math.floor(s%60)<10?"0":"")+Math.floor(s%60)}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function updateMedia(s){if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:s.name,artist:"Offline",artwork:[{src:s.cover,sizes:'512x512'}]});navigator.mediaSession.setActionHandler('play',()=>audio.play());navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('previoustrack',()=>document.getElementById("prev").click());navigator.mediaSession.setActionHandler('nexttrack',()=>document.getElementById("next").click())}}
