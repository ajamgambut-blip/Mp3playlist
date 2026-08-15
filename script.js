console.log("Musik Offline V3 - Ada Save");

// ===== DB BUAT NYIMPEN LAGU =====
let db;
const request = indexedDB.open("MusikOfflineDB", 1);

request.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("songs")) {
    db.createObjectStore("songs", { keyPath: "id", autoIncrement: true });
  }
};

request.onsuccess = (e) => {
  db = e.target.result;
  loadPlaylist(); // AUTO LOAD PAS BUKA APP
};

function saveSong(file) {
  const tx = db.transaction("songs", "readwrite");
  const store = tx.objectStore("songs");
  const reader = new FileReader();
  reader.onload = () => {
    store.add({
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Music",
      blob: reader.result // SIMPAN JADI BLOB
    });
  };
  reader.readAsArrayBuffer(file);
}

function loadPlaylist() {
  const tx = db.transaction("songs", "readonly");
  const store = tx.objectStore("songs");
  const request = store.getAll();
  request.onsuccess = () => {
    playlist = request.result.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      url: URL.createObjectURL(new Blob([song.blob]))
    }));
    updatePlaylist();
    if (playlist.length > 0 && currentIndex === -1) {
      playTrack(0);
    }
  };
}

// ===== ELEMENTS =====
const audio = document.getElementById("audioPlayer");
audio.setAttribute('playsinline', '');
audio.setAttribute('webkit-playsinline', '');
audio.volume = 1.0;

const addSongBtn = document.getElementById("addSongBtn");
const fileInput = document.getElementById("fileInput");
const playBtn = document.getElementById("playBtn");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const playlistEl = document.getElementById("playlist");
const songTitle = document.getElementById("songTitle");
const songArtist = document.getElementById("songArtist");

let playlist = [];
let currentIndex = -1;
let audioContext;

// ===== ADD SONG - UDAH AUTO SAVE =====
addSongBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    saveSong(file); // LANGSUNG SIMPAN KE DB
  });
  setTimeout(() => loadPlaylist(), 500); // RELOAD 0.5 DETIK KEMUDIAN
});

// ===== UPDATE PLAYLIST UI =====
function updatePlaylist() {
  playlistEl.innerHTML = "";
  playlist.forEach((track, index) => {
    const li = document.createElement("li");
    li.textContent = track.title;
    if (index === currentIndex) li.classList.add("active");
    li.addEventListener("click", () => playTrack(index));
    playlistEl.appendChild(li);
  });
}

// ===== PLAY TRACK =====
function playTrack(index) {
  if (!playlist[index]) return;
  currentIndex = index;
  const track = playlist[index];
  audio.src = track.url;
  songTitle.textContent = track.title;
  songArtist.textContent = track.artist;

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') audioContext.resume();

  updateMediaSession(track);
  audio.play();
  updatePlaylist();
}

// ===== MEDIA SESSION =====
function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title, artist: track.artist,
    artwork: [{src: 'icon-512.png', sizes: '512x512'}]
  });
  navigator.mediaSession.setActionHandler('play', () => audio.play());
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack', () => prevBtn.click());
  navigator.mediaSession.setActionHandler('nexttrack', () => nextBtn.click());
}

// ===== NEXT PREV =====
nextBtn.onclick = () => { currentIndex = (currentIndex + 1) % playlist.length; playTrack(currentIndex); }
prevBtn.onclick = () => { currentIndex = (currentIndex - 1 + playlist.length) % playlist.length; playTrack(currentIndex); }
audio.onended = () => nextBtn.click();

audio.onplay = () => playBtn.textContent = "⏸️";
audio.onpause = () => playBtn.textContent = "▶️";

// JAGA VOLUME BIAR GA BISU PAS LAYAR MATI
setInterval(() => { if(!audio.paused) audio.volume = 1.0 }, 1000);
