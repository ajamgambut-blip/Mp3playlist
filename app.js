// ======================
// ELEMENTS
// ======================
const audio = document.getElementById('audioPlayer');
const addSongBtn = document.getElementById('addSongBtn');
const fileInput = document.getElementById('fileInput');
const playBtn = document.getElementById('playBtn');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const progressBar = document.getElementById('progressBar');
const playlistEl = document.getElementById('playlist');
const songTitle = document.getElementById('songTitle');
const songArtist = document.getElementById('songArtist');
const coverArt = document.getElementById('coverArt');
// ======================
// DATA
// ======================
let playlist = [];
let currentIndex = -1;
// ======================
// ADD SONG
// ======================
addSongBtn.addEventListener('click', () => {
  fileInput.click();
});
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    playlist.push({
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local Music',
      url: URL.createObjectURL(file)
    });
  });
  updatePlaylist();
  if (currentIndex === -1 && playlist.length > 0) {
    playTrack(0);
  }
  fileInput.value = '';
});
// ======================
// PLAYLIST UI
// ======================
function updatePlaylist() {
  playlistEl.innerHTML = '';
  playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.textContent = track.title;
    if (index === currentIndex) {
      li.classList.add('active');
    }
    li.addEventListener('click', () => {
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
  coverArt.src =
    'https://via.placeholder.com/300/1DB954/FFFFFF?text=Music';
  audio.play();
  updatePlaylist();
}
// ======================
// PLAY / PAUSE
// ======================
playBtn.addEventListener('click', () => {
  if (playlist.length === 0) return;
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});
audio.addEventListener('play', () => {
  playBtn.textContent = '⏸️';
});
audio.addEventListener('pause', () => {
  playBtn.textContent = '▶️';
});
// ======================
// NEXT
// ======================
nextBtn.addEventListener('click', () => {
  if (playlist.length === 0) return;
  if (currentIndex < playlist.length - 1) {
    playTrack(currentIndex + 1);
  } else {
    playTrack(0);
  }
});
// ======================
// PREVIOUS
// ======================
prevBtn.addEventListener('click', () => {
  if (playlist.length === 0) return;
  if (currentIndex > 0) {
    playTrack(currentIndex - 1);
  } else {
    playTrack(playlist.length - 1);
  }
});
// ======================
// AUTO NEXT
// ======================
audio.addEventListener('ended', () => {
  nextBtn.click();
});
// ======================
// PROGRESS BAR
// ======================
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  progressBar.value =
    (audio.currentTime / audio.duration) * 100;
});
progressBar.addEventListener('input', () => {
  if (!audio.duration) return;
  audio.currentTime =
    (progressBar.value / 100) * audio.duration;
});
// ======================
// KEYBOARD SHORTCUTS
// ======================
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    playBtn.click();
  }
  if (e.code === 'ArrowRight') {
    nextBtn.click();
  }
  if (e.code === 'ArrowLeft') {
    prevBtn.click();
  }
});
