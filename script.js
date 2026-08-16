const API_KEY = "AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c";
const audio = document.getElementById("audio");
let offlineSongs = JSON.parse(localStorage.getItem("offlineSongs")) || [];
let playlistSongs = JSON.parse(localStorage.getItem("playlistSongs")) || [];
let currentPlaylist = []; let currentIndex = 0; let tempCover = null;
let isRepeat = false; let isShuffle = false;

loadOfflineList(); loadPlaylist();

// TAB
window.showTab = (tab)=>{
  document.querySelectorAll('.tab').forEach(t=>t.style.display='none');
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(tab+'-tab').style.display='block';
  document.querySelector(`[onclick="showTab('${tab}')"]`).classList.add('active');
}

// PLAYLIST
function savePlaylist(){ localStorage.setItem("playlistSongs", JSON.stringify(playlistSongs)); }
function loadPlaylist(){
  const list = document.getElementById("playlist"); list.innerHTML = "";
  playlistSongs.forEach((song, i)=>{
    list.innerHTML += `<div class="list-item"><img src="${song.cover}"><span onclick="playFromPlaylist(${i})">${song.title}</span><button onclick="deleteFromPlaylist(${i})">🗑</button></div>`
  })
}
window.addToPlaylist = (i)=>{
  const item = currentPlaylist[i];
  if(!playlistSongs.find(s=>s.id===item.id.videoId)){
    playlistSongs.push({id: item.id.videoId, title: item.snippet.title, cover: item.snippet.thumbnails.high.url});
    savePlaylist(); loadPlaylist(); alert("Ditambah ke Playlist!");
  }
}
window.deleteFromPlaylist = (i)=>{ playlistSongs.splice(i,1); savePlaylist(); loadPlaylist(); }
window.playFromPlaylist = (i)=>{ currentPlaylist=playlistSongs; currentIndex=i; playSong(`https://cdn.cobalt.tools/video/${playlistSongs[i].id}.mp3`, playlistSongs[i].title, "Playlist", playlistSongs[i].cover); }

// OFFLINE
document.querySelector(".btn-upload").onclick = ()=>{ document.getElementById("coverInput").click(); }
document.getElementById("coverInput").onchange = (e)=>{
  if(e.target.files[0]){ const reader = new FileReader(); reader.onload = ()=>{ tempCover = reader.result; document.getElementById("fileInput").click(); } reader.readAsDataURL(e.target.files[0]); }
}
document.getElementById("fileInput").onchange = (e)=>{
  [...e.target.files].forEach(file=>{
    const url = URL.createObjectURL(file);
    offlineSongs.push({name: file.name.replace(/\.[^/.]+$/, ""), url: url, cover: tempCover || "https://via.placeholder.com/300/1DB954/FFFFFF?text=OFFLINE", id: Date.now()});
  })
  tempCover = null; localStorage.setItem("offlineSongs", JSON.stringify(offlineSongs)); loadOfflineList();
}
function loadOfflineList(){
  const list = document.getElementById("offlineList"); list.innerHTML = "";
  offlineSongs.forEach((song, i)=>{
    list.innerHTML += `<div class="list-item"><img src="${song.cover}"><span onclick="playOffline(${i})">${song.name}</span><button onclick="deleteOffline(${i})">🗑</button></div>`
  })
}
window.deleteOffline = (i)=>{ offlineSongs.splice(i,1); localStorage.setItem("offlineSongs", JSON.stringify(offlineSongs)); loadOfflineList(); }
window.playOffline = (i)=>{ currentPlaylist=offlineSongs; currentIndex=i; playSong(offlineSongs[i].url, offlineSongs[i].name, "Offline", offlineSongs[i].cover); }

// ONLINE
document.getElementById("searchBtn").onclick = async ()=>{
  const q = document.getElementById("searchInput").value; if(!q) return;
  document.getElementById("searchResult").innerHTML = "Mencari...";
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=10&key=${API_KEY}`);
  const data = await res.json(); currentPlaylist = data.items;
  document.getElementById("searchResult").innerHTML = "";
  data.items.forEach((item, i)=>{
    document.getElementById("searchResult").innerHTML += `<div class="list-item"><img src="${item.snippet.thumbnails.default.url}"><span onclick="playYoutube(${i})">${item.snippet.title}</span><button onclick="addToPlaylist(${i})">➕</button></div>`
  })
}
window.playYoutube = (i)=>{ currentIndex=i; playSong(`https://cdn.cobalt.tools/video/${currentPlaylist[i].id.videoId}.mp3`, currentPlaylist[i].snippet.title, "YouTube", currentPlaylist[i].snippet.thumbnails.high.url); }

// PLAYER
function playSong(src, title, artist, cover){
  audio.src = src; document.getElementById("title").textContent = title; document.getElementById("artist").textContent = artist; document.getElementById("cover").src = cover;
  audio.play().catch(()=>{}); document.getElementById("play").textContent = "⏸";
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({title, artist, artwork: [{src: cover, sizes: '512x512'}]});
    navigator.mediaSession.setActionHandler('play', ()=>audio.play());
    navigator.mediaSession.setActionHandler('pause', ()=>audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', ()=>document.getElementById("prev").click());
    navigator.mediaSession.setActionHandler('nexttrack', ()=>document.getElementById("next").click());
  }
}
document.getElementById("play").onclick = ()=>{ audio.paused? audio.play() : audio.pause(); }
audio.onplay = ()=> document.getElementById("play").textContent = "⏸";
audio.onpause = ()=> document.getElementById("play").textContent = "▶";
audio.ontimeupdate = ()=>{ document.getElementById("progress").value = (audio.currentTime / audio.duration) * 100 || 0; document.getElementById("current").textContent = formatTime(audio.currentTime); }
audio.onloadedmetadata = ()=>{ document.getElementById("duration").textContent = formatTime(audio.duration); }
document.getElementById("progress").oninput = ()=>{ audio.currentTime = (document.getElementById("progress").value / 100) * audio.duration; }

// CONTROLS
document.getElementById("repeat").onclick = ()=>{ isRepeat =!isRepeat; audio.loop = isRepeat; document.getElementById("repeat").style.color = isRepeat? "#1DB954" : "#fff"; }
document.getElementById("shuffle").onclick = ()=>{ isShuffle =!isShuffle; document.getElementById("shuffle").style.color = isShuffle? "#1DB954" : "#fff"; }
document.getElementById("next").onclick = ()=>{ if(currentPlaylist.length === 0) return; currentIndex = isShuffle? Math.floor(Math.random() * currentPlaylist.length) : (currentIndex + 1) % currentPlaylist.length; playNextSong(); }
document.getElementById("prev").onclick = ()=>{ if(currentPlaylist.length === 0) return; currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length; playNextSong(); }
audio.onended = ()=>{ if(!isRepeat) document.getElementById("next").click(); }
function playNextSong(){ const activeTab = document.querySelector(".tab[style*='block']").id; if(activeTab === "online-tab") playYoutube(currentIndex); if(activeTab === "playlist-tab") playFromPlaylist(currentIndex); if(activeTab === "offline-tab") playOffline(currentIndex); }
function formatTime(s){ return Math.floor(s/60)+":"+(Math.floor(s%60)<10?"0":"")+Math.floor(s%60) }
