console.log("Musik Offline V2 Loaded");
// ======================
// ELEMENTS
// ======================
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
  audioContext =
    new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  source =
    audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  analyser.fftSize = 256;
  dataArray =
    new Uint8Array(analyser.frequencyBinCount);
  drawVisualizer();
}
function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  if (!analyser) return;
  analyser.getByteFrequencyData(dataArray);
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );
  const barWidth =
    canvas.width / dataArray.length;
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
// ======================
// ADD SONG
// ======================
addSongBtn.addEventListener("click", () => {
  fileInput.click();
});
fileInput.addEventListener("change", (event) => {
  const files =
    Array.from(event.target.files);
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
    const li =
      document.createElement("li");
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
// MEDIA SESSION
// ======================
if ("mediaSession" in navigator) {
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
}
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
fileInput.addEventListener("change", (event) => {

  alert("File berhasil dipilih!");

  console.log(event.target.files);

});
