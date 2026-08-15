console.log("Musik Offline V2 Loaded");

// ======================
// ELEMENTS
// ======================
const audio = document.getElementById("audioPlayer");
audio.setAttribute('playsinline', ''); // TAMBAH INI BIAR IOS GA MUTE
audio.setAttribute('webkit-playsinline', '');
audio.volume = 1.0; // WAJIB > 0 BIAR GA DI KILL
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

// ======================
// DATA
// ======================
let playlist = [];
let currentIndex = -1;

// ======================
// VISUALIZER
// ======================
let audioContext;
let analyser;
let source;
let dataArray;
function initVisualizer() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  drawVisualizer();
}
function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  if (!analyser) return;
  analyser.getByteFrequencyData(dataArray);
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = canvas.width / dataArray.length;
  let x = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const height = (dataArray[i] / 255) * canvas.height;
    ctx.fillStyle = "#1DB954";
    ctx.fillRect(x, canvas.height - height, barWidth - 1, height);
    x += barWidth;
  }
}

// ======================
// MEDIA SESSION - SATUIN DISINI AJA
// ======================
function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    artwork: [{src: 'icon-512.png', sizes: '512x512', type: 'image/png'}]
  });

  navigator.mediaSession.setActionHandler('play', () => audio.play());
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack', () => prevBtn.click());
  navigator.mediaSession.setActionHandler('nexttrack', () => nextBtn.click());
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    audio.currentTime = details.seekTime;
  });
}

// Update posisi di lockscreen
audio.addEventListener('timeupdate', () => {
  if ('mediaSession' in navigator && audio.duration) {
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate,
      position: audio.currentTime
    });
  }
});

// ======================
// ADD SONG
// ======================
addSongBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    playlist.push({
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Music",
      url: URL.createObjectURL(file)
    });
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
  coverArt.src = "icon-512.png";

  if (!audioContext) {
    initVisualizer();
  }

  updateMediaSession(track); // PANGGIL DISINI
  audio.play();
  updatePlaylist();
}

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
  if (audioContext && audioContext.state === 'suspended') audioContext.resume(); // BUAT IOS
});

audio.addEventListener("pause", () => {
  playBtn.textContent = "▶️";
});

// ======================
// NEXT / PREV
// ======================
nextBtn.addEventListener("click", () => {
  if (playlist.length === 0) return;
  currentIndex = (currentIndex + 1) % playlist.length;
  playTrack(currentIndex);
});

prevBtn.addEventListener("click", () => {
  if (playlist.length === 0) return;
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
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
  progressBar.value = (audio.currentTime / audio.duration) * 100;
});

progressBar.addEventListener("input", () => {
  if (!audio.duration) return;
  audio.currentTime = (progressBar.value / 100) * audio.duration;
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
