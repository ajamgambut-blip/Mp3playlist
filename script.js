console.log("Musik Offline Loaded");
// ======================
// ELEMENTS
// ======================
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");
let db;
let audioContext;
let analyser;
let source;
let dataArray;
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
// ======================
// DATA
// ======================
let playlist = [];
let currentIndex = -1;
// ======================
// ADD SONG
// ======================
addSongBtn.addEventListener("click", () => {
  fileInput.click();
});
fileInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    const track = {
  title: file.name,
  artist: "Local Music",
  url: URL.createObjectURL(file)
};

playlist.push(track);

if (db) {
  saveSong(track);
}
  });
  updatePlaylist();
  if (playlist.length > 0 && currentIndex === -1) {
    playTrack(0);
  }
});
// ======================
// PLAYLIST UI
// ======================
function updatePlaylist() {
  playlistEl.innerHTML = "";
  playlist.forEach((track, index) => {
    const li = document.createElement("li");
    li.textContent = track.title;
    if (index === currentIndex) {
      li.classList.add("active");
    }
    li.addEventListener("click", () => {
      playTrack(index);
    });
    playlistEl.appendChild(li);
  });
}
// ======================
// PLAY TRACK
// ======================
function playTrack(index) {
  if (!playlist[index]) return;
  currentIndex = index;
  const track = playlist[index];
  audio.src = track.url;
  songTitle.textContent = track.title;
  songArtist.textContent = track.artist;
  // cover sementara
  coverArt.src = "icon-512.png";
  audio.play();
  updatePlaylist();
}
if (!audioContext) {
  initVisualizer();
}
if ("mediaSession" in navigator) {

  navigator.mediaSession.metadata =
    new MediaMetadata({
      title: track.title,
      artist: track.artist,
      artwork: [
        {
          src: "icon-512.png",
          sizes: "512x512",
          type: "image/png"
        }
      ]
    });

}
navigator.mediaSession.setActionHandler(
  "nexttrack",
  () => nextBtn.click()
);

navigator.mediaSession.setActionHandler(
  "previoustrack",
  () => prevBtn.click()
);

navigator.mediaSession.setActionHandler(
  "play",
  () => audio.play()
);

navigator.mediaSession.setActionHandler(
  "pause",
  () => audio.pause()
);
// ======================
// PLAY / PAUSE
// ======================
playBtn.addEventListener("click", () => {
  if (playlist.length === 0) return;
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});
audio.addEventListener("play", () => {
  playBtn.textContent = "⏸️";
});
audio.addEventListener("pause", () => {
  playBtn.textContent = "▶️";
});
// ======================
// NEXT
// ======================
nextBtn.addEventListener("click", () => {
  if (playlist.length === 0) return;
  currentIndex++;
  if (currentIndex >= playlist.length) {
    currentIndex = 0;
  }
  playTrack(currentIndex);
});
// ======================
// PREVIOUS
// ======================
prevBtn.addEventListener("click", () => {
  if (playlist.length === 0) return;
  currentIndex--;
  if (currentIndex < 0) {
    currentIndex = playlist.length - 1;
  }
  playTrack(currentIndex);
});
// ======================
// AUTO NEXT
// ======================
audio.addEventListener("ended", () => {
  nextBtn.click();
});
// ======================
// PROGRESS BAR
// ======================
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  progressBar.value =
    (audio.currentTime / audio.duration) * 100;
});
progressBar.addEventListener("input", () => {
  if (!audio.duration) return;
  audio.currentTime =
    (progressBar.value / 100) * audio.duration;
});
// ======================
// KEYBOARD
// ======================
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    playBtn.click();
  }
  if (e.code === "ArrowRight") {
    nextBtn.click();
  }
  if (e.code === "ArrowLeft") {
    prevBtn.click();
  }
});
function initVisualizer() {

  if (audioContext) return;

  audioContext = new AudioContext();

  analyser = audioContext.createAnalyser();

  source = audioContext.createMediaElementSource(audio);

  source.connect(analyser);
  analyser.connect(audioContext.destination);

  analyser.fftSize = 256;

  const bufferLength = analyser.frequencyBinCount;

  dataArray = new Uint8Array(bufferLength);

  drawVisualizer();
}
function drawVisualizer() {

  requestAnimationFrame(drawVisualizer);

  analyser.getByteFrequencyData(dataArray);

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const barWidth = canvas.width / dataArray.length;

  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {

    const height =
      (dataArray[i] / 255) * canvas.height;

    ctx.fillStyle = "#1DB954";

    ctx.fillRect(
      x,
      canvas.height - height,
      barWidth - 1,
      height
    );

    x += barWidth;
  }
}
function initDB() {

  const request =
    indexedDB.open("MusicPlayerDB", 1);

  request.onupgradeneeded = (event) => {

    db = event.target.result;

    if (!db.objectStoreNames.contains("songs")) {

      db.createObjectStore(
        "songs",
        { keyPath: "id", autoIncrement: true }
      );

    }

  };

  request.onsuccess = (event) => {

    db = event.target.result;

    loadSongs();

  };

}
function saveSong(song) {

  const tx =
    db.transaction("songs", "readwrite");

  const store =
    tx.objectStore("songs");

  store.add(song);

}
function loadSongs() {

  const tx =
    db.transaction("songs", "readonly");

  const store =
    tx.objectStore("songs");

  const request = store.getAll();

  request.onsuccess = () => {

    playlist = request.result;

    updatePlaylist();

  };

}
initDB();

