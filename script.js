const API_KEY = "AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c";
const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const coverEl = document.getElementById("cover");
const progress = document.getElementById("progress");
let currentPlaylist = [];
let currentIndex = 0;

let offlineSongs = JSON.parse(localStorage.getItem("offlineSongs")) || [];
loadOfflineList();

// TAB SWITCH
function showTab(tab){
  document.querySelectorAll('.tab').forEach(t=>t.style.display='none');
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(tab+'-tab').style.display='block';
  event.target.classList.add('active');
}

// OFFLINE: ADD + HAPUS + SIMPAN
document.getElementById("fileInput").onchange = (e)=>{
  [...e.target.files].forEach(file=>{
    const url = URL.createObjectURL(file);
    offlineSongs.push({name: file.name.replace(/\.[^/.]+$/, ""), url: url, id: Date.now()});
  })
  saveOffline();
  loadOfflineList();
}

function saveOffline(){
  localStorage.setItem("offlineSongs", JSON.stringify(offlineSongs));
}

function loadOfflineList(){
  const list = document.getElementById("offlineList");
  list.innerHTML = "";
  offlineSongs.forEach((song, i)=>{
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <span onclick="playOffline(${i})">📁 ${song.name}</span>
      <button onclick="deleteOffline(${i})">🗑</button>
    `;
    list.appendChild(div);
  })
}

function deleteOffline(i){
  offlineSongs.splice(i,1);
  saveOffline();
  loadOfflineList();
}

function playOffline(i){
  currentPlaylist = offlineSongs;
  currentIndex = i;
  const song = offlineSongs[i];
  playSong(song.url, song.name, "Offline", "https://via.placeholder.com/300/1DB954/FFFFFF?text=OFFLINE");
}

// ONLINE: CARI YOUTUBE
document.getElementById("searchBtn").onclick = async ()=>{
  const q = document.getElementById("searchInput").value;
  if(!q) return;
  document.getElementById("searchResult").innerHTML = "Mencari...";

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=10&key=${API_KEY}`);
  const data = await res.json();

  currentPlaylist = data.items;
  document.getElementById("searchResult").innerHTML = "";
  data.items.forEach((item, i)=>{
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <img src="${item.snippet.thumbnails.default.url}">
      <span onclick="playYoutube(${i})">${item.snippet.title}</span>
    `;
    document.getElementById("searchResult").appendChild(div);
  })
}

function playYoutube(i){
  currentIndex = i;
  const item = currentPlaylist[i];
  playSong(`https://yewtu.be/latest_version?id=${item.id.videoId}&itag=140`,
           item.snippet.title,
           "YouTube",
           item.snippet.thumbnails.high.url);
}

// CORE PLAYER
function playSong(src, title, artist, cover){
  audio.src = src;
  titleEl.textContent = title;
  artistEl.textContent = artist;
  coverEl.src = cover;
  audio.play();
  playBtn.textContent = "⏸";

  // BIAR MUNCUL DI LOCKSCREEN
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title, artist: artist, artwork: [{src: cover, sizes: '300x300'}]
    });
  }
}

playBtn.onclick = ()=>{ audio.paused? audio.play() : audio.pause(); }
audio.onplay = ()=> playBtn.textContent = "⏸";
audio.onpause = ()=> playBtn.textContent = "▶";

audio.ontimeupdate = ()=>{
  progress.value = (audio.currentTime / audio.duration) * 100 || 0;
  document.getElementById("current").textContent = formatTime(audio.currentTime);
}
audio.onloadedmetadata = ()=>{
  document.getElementById("duration").textContent = formatTime(audio.duration);
}
progress.oninput = ()=>{ audio.currentTime = (progress.value / 100) * audio.duration; }

function formatTime(s){ return Math.floor(s/60)+":"+(Math.floor(s%60)<10?"0":"")+Math.floor(s%60) }
