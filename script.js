const API_KEY = "AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c"; // punya kamu
const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResult = document.getElementById("searchResult");
let isYoutube = false;

searchBtn.onclick = async ()=>{
  const q = searchInput.value;
  if(!q) return;
  searchResult.innerHTML = "Mencari...";
  
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=5&key=${API_KEY}`);
  const data = await res.json();
  
  searchResult.innerHTML = "";
  data.items.forEach(item=>{
    const div = document.createElement("div");
    div.className = "yt-item";
    div.innerHTML = `
      <img src="${item.snippet.thumbnails.default.url}">
      <span>${item.snippet.title}</span>
    `;
    div.onclick = ()=>playYoutube(item.id.videoId, item.snippet.title);
    searchResult.appendChild(div);
  })
}

function playYoutube(videoId, title){
  isYoutube = true;
  audio.pause();
  document.getElementById("yt-player").src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&playsinline=1`;
  titleEl.textContent = title;
  artistEl.textContent = "YouTube";
  playBtn.textContent = "⏸";
}

playBtn.onclick = ()=>{
  if(isYoutube){
    // buat YouTube, play/pause lewat iframe agak ribet. Jadi pake trik kunci HP > play dari control center
    alert("Untuk YouTube: Kunci HP > Buka Control Center > Pencet Play")
  } else {
    audio.paused ? audio.play() : audio.pause();
  }
}
