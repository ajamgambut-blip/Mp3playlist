// Array buat nyimpen lagu
let playlist = [];
let currentIndex = 0;
const audio = document.getElementById('audio');
const addSongBtn = document.getElementById('addSongBtn');
const fileInput = document.getElementById('fileInput');
const playBtn = document.getElementById('playBtn');
const songTitle = document.getElementById('songTitle');
const playlistEl = document.getElementById('playlist');

// 1. Tombol Add Song
addSongBtn.onclick = () => {
  fileInput.click(); // buka file picker
}

// 2. Pas file dipilih
fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Bikin URL dari file MP3
  const url = URL.createObjectURL(file);

  // Masukkin ke playlist
  const track = {
    title: file.name.replace('.mp3', ''),
    url: url
  };
  playlist.push(track);

  updatePlaylist();

  // Auto play kalo ini lagu pertama
  if (playlist.length === 1) {
    playTrack(0);
  }
}

// 3. Update list lagu di HTML
function updatePlaylist() {
  playlistEl.innerHTML = '';
  playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.textContent = track.title;
    li.onclick = () => playTrack(index);
    if (index === currentIndex) li.classList.add('active');
    playlistEl.appendChild(li);
  });
}

// 4. Play lagu
function playTrack(index) {
  currentIndex = index;
  const track = playlist[index];
  audio.src = track.url;
  songTitle.textContent = track.title;
  audio.play();
  playBtn.textContent = '⏸️';
  updatePlaylist();
}

// 5. Tombol Play/Pause
playBtn.onclick = () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = '⏸️';
  } else {
    audio.pause();
