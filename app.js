// Playlist data
let playlist = [];
let currentIndex = 0;
// Elements
const audio = document.getElementById('audio');
const addSongBtn = document.getElementById('addSongBtn');
const fileInput = document.getElementById('fileInput');
const playBtn = document.getElementById('playBtn');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const songTitle = document.getElementById('songTitle');
const playlistEl = document.getElementById('playlist');
// Add Song
addSongBtn.onclick = () => {
  fileInput.click();
};
// File selected
fileInput.onchange = (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    playlist.push({
      title: file.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(file)
    });
  });
  updatePlaylist();
  if (playlist.length > 0 && audio.src === '') {
    playTrack(0);
  }
  fileInput.value = '';
};
// Update playlist UI
function updatePlaylist() {
  playlistEl.innerHTML = '';
  playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.textContent = track.title;
    if (index === currentIndex) {
      li.classList.add('active');
    }
    li.onclick = () => {
      playTrack(index);
    };
    playlistEl.appendChild(li);
  });
}
// Play track
function playTrack(index) {
  if (!playlist[index]) return;
  currentIndex = index;
  audio.src = playlist[index].url;
  songTitle.textContent = playlist[index].title;
  audio.play();
  updatePlaylist();
}
// Play / Pause
playBtn.onclick = () => {
  if (playlist.length === 0) return;
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
};
// Next
nextBtn.onclick = () => {
  if (playlist.length === 0) return;
  if (currentIndex < playlist.length - 1) {
    playTrack(currentIndex + 1);
  }
};
// Previous
prevBtn.onclick = () => {
  if (playlist.length === 0) return;
  if (currentIndex > 0) {
    playTrack(currentIndex - 1);
  }
};
// Auto next when song ends
audio.onended = () => {
  if (currentIndex < playlist.length - 1) {
    playTrack(currentIndex + 1);
  }
};
// Sync button icon
audio.onplay = () => {
  playBtn.textContent = '⏸️';
};
audio.onpause = () => {
  playBtn.textContent = '▶️';
};
// Optional keyboard shortcuts
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
