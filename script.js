/* =========================================================
   MYMUSIC FINAL
   IndexedDB Music Storage
   Local MP3 / WAV / M4A / AAC / MP4
   YouTube Online
   Media Session
   PWA
========================================================= */
/* =========================================================
   ELEMENTS
========================================================= */
const audio =
    document.getElementById("audio");
const video =
    document.getElementById("video");
const titleEl =
    document.getElementById("title");
const artistEl =
    document.getElementById("artist");
const cover =
    document.getElementById("cover");
const playlistEl =
    document.getElementById("playlist");
const playBtn =
    document.getElementById("playBtn");
const prevBtn =
    document.getElementById("prevBtn");
const nextBtn =
    document.getElementById("nextBtn");
const progress =
    document.getElementById("progress");
const currentTimeEl =
    document.getElementById("currentTime");
const durationEl =
    document.getElementById("duration");
const fileInput =
    document.getElementById("fileInput");
const youtubeInput =
    document.getElementById("youtubeInput");
const youtubeBtn =
    document.getElementById("youtubeBtn");
const clearBtn =
    document.getElementById("clearBtn");
const shuffleBtn =
    document.getElementById("shuffleBtn");
const repeatBtn =
    document.getElementById("repeatBtn");
const libraryCount =
    document.getElementById("libraryCount");
const addBtn =
    document.getElementById("addBtn");
const addPanel =
    document.getElementById("addPanel");
/* =========================================================
   DATABASE CONFIG
========================================================= */
const DB_NAME =
    "MyMusicDatabase";
const DB_VERSION = 1;
const STORE =
    "tracks";
let db = null;
let library = [];
let currentIndex = -1;
let currentObjectURL = null;
let shuffle = false;
let repeat = false;
let youtubePlayer = null;
let youtubeReady = false;
/* =========================================================
   OPEN DATABASE
========================================================= */
function openDatabase(){
    return new Promise(
        (resolve,reject)=>{
            const request =
                indexedDB.open(
                    DB_NAME,
                    DB_VERSION
                );
            request.onupgradeneeded =
                event => {
                    const database =
                        event.target.result;
                    if(
                        !database.objectStoreNames
                            .contains(STORE)
                    ){
                        const store =
                            database.createObjectStore(
                                STORE,
                                {
                                    keyPath:"id"
                                }
                            );
                        store.createIndex(
                            "createdAt",
                            "createdAt"
                        );
                    }
                };
            request.onsuccess =
                event => {
                    db =
                        event.target.result;
                    resolve(db);
                };
            request.onerror =
                event => {
                    reject(
                        event.target.error
                    );
                };
        }
    );
}
/* =========================================================
   ADD RECORD
========================================================= */
function addTrack(track){
    return new Promise(
        (resolve,reject)=>{
            const transaction =
                db.transaction(
                    STORE,
                    "readwrite"
                );
            const store =
                transaction.objectStore(
                    STORE
                );
            const request =
                store.add(track);
            request.onsuccess =
                ()=>resolve(track);
            request.onerror =
                event =>
                    reject(
                        event.target.error
                    );
        }
    );
}
/* =========================================================
   GET ALL
========================================================= */
function getAllTracks(){
    return new Promise(
        (resolve,reject)=>{
            const transaction =
                db.transaction(
                    STORE,
                    "readonly"
                );
            const store =
                transaction.objectStore(
                    STORE
                );
            const request =
                store.getAll();
            request.onsuccess =
                ()=>{
                    resolve(
                        request.result
                            .sort(
                                (a,b)=>
                                    a.createdAt -
                                    b.createdAt
                            )
                    );
                };
            request.onerror =
                event =>
                    reject(
                        event.target.error
                    );
        }
    );
}
/* =========================================================
   GET TRACK
========================================================= */
function getTrack(id){
    return new Promise(
        (resolve,reject)=>{
            const transaction =
                db.transaction(
                    STORE,
                    "readonly"
                );
            const store =
                transaction.objectStore(
                    STORE
                );
            const request =
                store.get(id);
            request.onsuccess =
                ()=>{
                    resolve(
                        request.result
                    );
                };
            request.onerror =
                event =>
                    reject(
                        event.target.error
                    );
        }
    );
}
/* =========================================================
   DELETE TRACK
========================================================= */
function deleteTrack(id){
    return new Promise(
        (resolve,reject)=>{
            const transaction =
                db.transaction(
                    STORE,
                    "readwrite"
                );
            const store =
                transaction.objectStore(
                    STORE
                );
            const request =
                store.delete(id);
            request.onsuccess =
                ()=>resolve();
            request.onerror =
                event =>
                    reject(
                        event.target.error
                    );
        }
    );
}
/* =========================================================
   DELETE ALL
========================================================= */
function deleteAllTracks(){
    return new Promise(
        (resolve,reject)=>{
            const transaction =
                db.transaction(
                    STORE,
                    "readwrite"
                );
            const store =
                transaction.objectStore(
                    STORE
                );
            const request =
                store.clear();
            request.onsuccess =
                ()=>resolve();
            request.onerror =
                event =>
                    reject(
                        event.target.error
                    );
        }
    );
}
/* =========================================================
   FORMAT TIME
========================================================= */
function formatTime(seconds){
    if(
        !seconds ||
        isNaN(seconds) ||
        !isFinite(seconds)
    ){
        return "0:00";
    }
    const minutes =
        Math.floor(
            seconds / 60
        );
    const secs =
        Math.floor(
            seconds % 60
        )
        .toString()
        .padStart(2,"0");
    return `${minutes}:${secs}`;
}
/* =========================================================
   RENDER LIBRARY
========================================================= */
function renderLibrary(){
    playlistEl.innerHTML = "";
    libraryCount.textContent =
        `${library.length} lagu`;
    if(library.length === 0){
        playlistEl.innerHTML = `
            <div class="empty">
                Belum ada musik.<br>
                Tambahkan MP3, WAV,
                M4A, AAC atau MP4.
            </div>
        `;
        return;
    }
    library.forEach(
        (item,index)=>{
            const element =
                document.createElement(
                    "div"
                );
            element.className =
                "track";
            const coverHTML =
                item.cover
                ?
                `<img src="${item.cover}">`
                :
                `♪`;
            const typeText =
                item.type === "youtube"
                ?
                "YouTube • Online"
                :
                `${item.mime || "Local file"} • Offline`;
            element.innerHTML = `
                <div class="track-cover">
                    ${coverHTML}
                </div>
                <div class="track-info">
                    <div class="track-title">
                        ${escapeHTML(
                            item.title
                        )}
                    </div>
                    <div class="track-type">
                        ${typeText}
                    </div>
                </div>
                <div class="track-buttons">
                    <button
                        class="track-play"
                        title="Putar"
                    >
                        ▶
                    </button>
                    <button
                        class="track-delete"
                        title="Hapus"
                    >
                        ×
                    </button>
                </div>
            `;
            element
                .querySelector(
                    ".track-play"
                )
                .onclick =
                    ()=>{
                        playTrack(index);
                    };
            element
                .querySelector(
                    ".track-delete"
                )
                .onclick =
                    async ()=>{
                        await removeTrack(
                            index
                        );
                    };
            playlistEl.appendChild(
                element
            );
        }
    );
}
/* =========================================================
   ESCAPE HTML
========================================================= */
function escapeHTML(value){
    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}
/* =========================================================
   IMPORT LOCAL FILES
========================================================= */
fileInput.addEventListener(
    "change",
    async event => {
        const files =
            Array.from(
                event.target.files
            );
        if(!files.length)
            return;
        addPanel.classList.add(
            "importing"
        );
        try{
            for(
                const file of files
            ){
                const track = {
                    id:
                        crypto.randomUUID(),
                    type:
                        "local",
                    title:
                        file.name.replace(
                            /\.[^/.]+$/,
                            ""
                        ),
                    filename:
                        file.name,
                    mime:
                        file.type ||
                        guessMime(
                            file.name
                        ),
                    size:
                        file.size,
                    blob:
                        file,
                    cover:
                        null,
                    createdAt:
                        Date.now()
                };
                await addTrack(
                    track
                );
            }
            library =
                await getAllTracks();
            renderLibrary();
            alert(
                `${files.length} file berhasil ditambahkan.`
            );
        }
        catch(error){
            console.error(error);
            alert(
                "Gagal menyimpan file."
            );
        }
        finally{
            addPanel.classList.remove(
                "importing"
            );
            fileInput.value = "";
        }
    }
);
/* =========================================================
   GUESS MIME
========================================================= */
function guessMime(filename){
    const extension =
        filename
            .split(".")
            .pop()
            .toLowerCase();
    const types = {
        mp3:"audio/mpeg",
        wav:"audio/wav",
        m4a:"audio/mp4",
        aac:"audio/aac",
        mp4:"video/mp4"
    };
    return (
        types[extension] ||
        "application/octet-stream"
    );
}
/* =========================================================
   PLAY TRACK
========================================================= */
async function playTrack(index){
    if(
        index < 0 ||
        index >= library.length
    ){
        return;
    }
    currentIndex =
        index;
    const item =
        library[index];
    stopAllMedia();
    titleEl.textContent =
        item.title;
    artistEl.textContent =
        item.type === "youtube"
        ?
        "YouTube • Online"
        :
        "Local Music • Offline";
    updateCover(item);
    progress.value = 0;
    currentTimeEl.textContent =
        "0:00";
    durationEl.textContent =
        "0:00";
    if(
        item.type === "youtube"
    ){
        playYouTube(item);
    }
    else{
        await playLocal(item);
    }
}
/* =========================================================
   PLAY LOCAL
========================================================= */
async function playLocal(item){
    if(!item.blob){
        alert(
            "File tidak ditemukan."
        );
        return;
    }
    revokeCurrentURL();
    currentObjectURL =
        URL.createObjectURL(
            item.blob
        );
    const isVideo =
        item.mime === "video/mp4" ||
        item.mime.startsWith(
            "video/"
        );
    if(isVideo){
        video.style.display =
            "block";
        audio.style.display =
            "none";
        video.src =
            currentObjectURL;
        video.load();
        try{
            await video.play();
        }
        catch(error){
            console.log(
                "Autoplay blocked:",
                error
            );
        }
        setupMediaSession(
            item
        );
    }
    else{
        video.style.display =
            "none";
        audio.style.display =
            "block";
        audio.src =
            currentObjectURL;
        audio.load();
        try{
            await audio.play();
        }
        catch(error){
            console.log(
                "Autoplay blocked:",
                error
            );
        }
        setupMediaSession(
            item
        );
    }
    playBtn.textContent =
        "⏸";
}
/* =========================================================
   STOP ALL MEDIA
========================================================= */
function stopAllMedia(){
    audio.pause();
    video.pause();
    audio.removeAttribute(
        "src"
    );
    video.removeAttribute(
        "src"
    );
    audio.load();
    video.load();
    if(youtubePlayer){
        try{
            youtubePlayer.stopVideo();
        }
        catch(error){}
    }
    revokeCurrentURL();
}
/* =========================================================
   OBJECT URL
========================================================= */
function revokeCurrentURL(){
    if(currentObjectURL){
        URL.revokeObjectURL(
            currentObjectURL
        );
        currentObjectURL =
            null;
    }
}
/* =========================================================
   PLAY / PAUSE
========================================================= */
playBtn.onclick =
    async ()=>{
        if(
            currentIndex === -1
        ){
            if(library.length){
                await playTrack(0);
            }
            return;
        }
        const item =
            library[currentIndex];
        if(
            item.type === "youtube"
        ){
            if(
                !youtubePlayer ||
                !youtubeReady
            ){
                return;
            }
            const state =
                youtubePlayer
                    .getPlayerState();
            if(
                state ===
                YT.PlayerState.PLAYING
            ){
                youtubePlayer.pauseVideo();
            }
            else{
                youtubePlayer.playVideo();
            }
            return;
        }
        const media =
            getCurrentMedia();
        if(!media)
            return;
        if(media.paused){
            try{
                await media.play();
            }
            catch(error){
                console.log(error);
            }
        }
        else{
            media.pause();
        }
    };
/* =========================================================
   GET CURRENT MEDIA
========================================================= */
function getCurrentMedia(){
    if(
        video.style.display !==
        "none"
    ){
        return video;
    }
    return audio;
}
/* =========================================================
   NEXT
========================================================= */
function nextTrack(){
    if(
        library.length === 0
    ){
        return;
    }
    if(
        repeat &&
        currentIndex !== -1
    ){
        playTrack(
            currentIndex
        );
        return;
    }
    let nextIndex;
    if(shuffle){
        if(
            library.length === 1
        ){
            nextIndex = 0;
        }
        else{
            do{
                nextIndex =
                    Math.floor(
                        Math.random() *
                        library.length
                    );
            }
            while(
                nextIndex ===
                currentIndex
            );
        }
    }
    else{
        nextIndex =
            currentIndex + 1;
        if(
            nextIndex >=
            library.length
        ){
            nextIndex = 0;
        }
    }
    playTrack(
        nextIndex
    );
}
/* =========================================================
   PREVIOUS
========================================================= */
function previousTrack(){
    if(
        library.length === 0
    ){
        return;
    }
    const media =
        getCurrentMedia();
    if(
        media &&
        media.currentTime > 5
    ){
        media.currentTime = 0;
        return;
    }
    let previous =
        currentIndex - 1;
    if(previous < 0){
        previous =
            library.length - 1;
    }
    playTrack(
        previous
    );
}
nextBtn.onclick =
    nextTrack;
prevBtn.onclick =
    previousTrack;
/* =========================================================
   MEDIA EVENTS
========================================================= */
[audio,video].forEach(
    media => {
        media.addEventListener(
            "loadedmetadata",
            ()=>{
                if(
                    isFinite(
                        media.duration
                    )
                ){
                    durationEl.textContent =
                        formatTime(
                            media.duration
                        );
                }
            }
        );
        media.addEventListener(
            "timeupdate",
            ()=>{
                if(
                    !media.duration ||
                    !isFinite(
                        media.duration
                    )
                ){
                    return;
                }
                progress.value =
                    (
                        media.currentTime /
                        media.duration
                    ) * 100;
                currentTimeEl.textContent =
                    formatTime(
                        media.currentTime
                    );
            }
        );
        media.addEventListener(
            "play",
            ()=>{
                playBtn.textContent =
                    "⏸";
            }
        );
        media.addEventListener(
            "pause",
            ()=>{
                playBtn.textContent =
                    "▶";
            }
        );
        media.addEventListener(
            "ended",
            ()=>{
                nextTrack();
            }
        );
    }
);
/* =========================================================
   SEEK
========================================================= */
progress.addEventListener(
    "input",
    ()=>{
        if(
            currentIndex === -1
        ){
            return;
        }
        const item =
            library[currentIndex];
        if(
            item.type === "youtube"
        ){
            if(
                youtubePlayer &&
                youtubeReady
            ){
                const duration =
                    youtubePlayer
                        .getDuration();
                youtubePlayer.seekTo(
                    duration *
                    (
                        progress.value /
                        100
                    ),
                    true
                );
            }
            return;
        }
        const media =
            getCurrentMedia();
        if(
            media &&
            media.duration
        ){
            media.currentTime =
                media.duration *
                (
                    progress.value /
                    100
                );
        }
    }
);
/* =========================================================
   SHUFFLE
========================================================= */
shuffleBtn.onclick =
    ()=>{
        shuffle =
            !shuffle;
        shuffleBtn.classList.toggle(
            "active",
            shuffle
        );
    };
/* =========================================================
   REPEAT
========================================================= */
repeatBtn.onclick =
    ()=>{
        repeat =
            !repeat;
        repeatBtn.classList.toggle(
            "active",
            repeat
        );
    };
/* =========================================================
   REMOVE TRACK
========================================================= */
async function removeTrack(index){
    if(
        index < 0 ||
        index >= library.length
    ){
        return;
    }
    const item =
        library[index];
    if(
        !confirm(
            `Hapus "${item.title}"?`
        )
    ){
        return;
    }
    if(
        index === currentIndex
    ){
        stopAllMedia();
        currentIndex = -1;
        resetPlayer();
    }
    await deleteTrack(
        item.id
    );
    library =
        await getAllTracks();
    if(
        currentIndex > index
    ){
        currentIndex--;
    }
    renderLibrary();
}
/* =========================================================
   DELETE ALL
========================================================= */
clearBtn.onclick =
    async ()=>{
        if(
            library.length === 0
        ){
            return;
        }
        if(
            !confirm(
                "Hapus seluruh library?"
            )
        ){
            return;
        }
        stopAllMedia();
        await deleteAllTracks();
        library = [];
        currentIndex = -1;
        resetPlayer();
        renderLibrary();
    };
/* =========================================================
   RESET PLAYER
========================================================= */
function resetPlayer(){
    titleEl.textContent =
        "Belum ada lagu";
    artistEl.textContent =
        "Tambahkan musik untuk mulai";
    cover.innerHTML =
        "<span>♪</span>";
    progress.value = 0;
    currentTimeEl.textContent =
        "0:00";
    durationEl.textContent =
        "0:00";
    playBtn.textContent =
        "▶";
    video.style.display =
        "none";
}
/* =========================================================
   COVER
========================================================= */
function updateCover(item){
    if(item.cover){
        cover.innerHTML =
            `<img src="${item.cover}">`;
    }
    else{
        cover.innerHTML =
            "<span>♪</span>";
    }
}
/* =========================================================
   YOUTUBE ID
========================================================= */
function extractYouTubeId(url){
    try{
        const parsed =
            new URL(url);
        if(
            parsed.hostname.includes(
                "youtu.be"
            )
        ){
            return parsed.pathname
                .substring(1)
                .split("?")[0];
        }
        if(
            parsed.hostname.includes(
                "youtube.com"
            )
        ){
            const v =
                parsed.searchParams
                    .get("v");
            if(v)
                return v;
            const parts =
                parsed.pathname
                    .split("/")
                    .filter(Boolean);
            const embed =
                parts.indexOf(
                    "embed"
                );
            if(embed !== -1){
                return parts[
                    embed + 1
                ];
            }
            const shorts =
                parts.indexOf(
                    "shorts"
                );
            if(shorts !== -1){
                return parts[
                    shorts + 1
                ];
            }
        }
    }
    catch(error){}
    return null;
}
/* =========================================================
   ADD YOUTUBE
========================================================= */
youtubeBtn.onclick =
    async ()=>{
        const url =
            youtubeInput.value.trim();
        const youtubeId =
            extractYouTubeId(
                url
            );
        if(!youtubeId){
            alert(
                "Link YouTube tidak valid."
            );
            return;
        }
        const track = {
            id:
                crypto.randomUUID(),
            type:
                "youtube",
            title:
                `YouTube - ${youtubeId}`,
            youtubeId:
                youtubeId,
            cover:
                `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
            createdAt:
                Date.now()
        };
        await addTrack(
            track
        );
        library =
            await getAllTracks();
        renderLibrary();
        youtubeInput.value = "";
        /*
           Langsung buka/play jika
           YouTube API sudah siap.
        */
        const index =
            library.findIndex(
                x =>
                    x.id === track.id
            );
        if(index !== -1){
            playTrack(index);
        }
    };
/* =========================================================
   YOUTUBE API
========================================================= */
window.onYouTubeIframeAPIReady =
    function(){
        youtubePlayer =
            new YT.Player(
                "youtubePlayer",
                {
                    height:"1",
                    width:"1",
                    videoId:"",
                    playerVars:{
                        autoplay:0,
                        controls:0,
                        playsinline:1,
                        rel:0
                    },
                    events:{
                        onReady:
                            ()=>{
                                youtubeReady =
                                    true;
                            },
                        onStateChange:
                            onYouTubeState,
                        onError:
                            event => {
                                console.log(
                                    "YouTube error:",
                                    event.data
                                );
                            }
                    }
                }
            );
    };
/* =========================================================
   PLAY YOUTUBE
========================================================= */
function playYouTube(item){
    if(
        !youtubePlayer ||
        !youtubeReady
    ){
        alert(
            "YouTube Player belum siap."
        );
        return;
    }
    youtubePlayer.loadVideoById(
        item.youtubeId
    );
    youtubePlayer.playVideo();
    playBtn.textContent =
        "⏸";
    titleEl.textContent =
        item.title;
    artistEl.textContent =
        "YouTube • Online";
}
/* =========================================================
   YOUTUBE STATE
========================================================= */
function onYouTubeState(event){
    if(
        !window.YT
    ){
        return;
    }
    if(
        event.data ===
        YT.PlayerState.PLAYING
    ){
        playBtn.textContent =
            "⏸";
        updateYouTubeProgress();
    }
    if(
        event.data ===
        YT.PlayerState.PAUSED
    ){
        playBtn.textContent =
            "▶";
    }
    if(
        event.data ===
        YT.PlayerState.ENDED
    ){
        nextTrack();
    }
}
/* =========================================================
   YOUTUBE PROGRESS
========================================================= */
setInterval(
    ()=>{
        if(
            currentIndex === -1 ||
            !youtubePlayer ||
            !youtubeReady
        ){
            return;
        }
        const item =
            library[currentIndex];
        if(
            !item ||
            item.type !== "youtube"
        ){
            return;
        }
        try{
            const duration =
                youtubePlayer
                    .getDuration();
            const current =
                youtubePlayer
                    .getCurrentTime();
            if(
                duration > 0
            ){
                progress.value =
                    (
                        current /
                        duration
                    ) * 100;
                currentTimeEl.textContent =
                    formatTime(
                        current
                    );
                durationEl.textContent =
                    formatTime(
                        duration
                    );
            }
        }
        catch(error){}
    },
    500
);
/* =========================================================
   MEDIA SESSION
========================================================= */
function setupMediaSession(item){
    if(
        !("mediaSession" in navigator)
    ){
        return;
    }
    const metadata = {
        title:
            item.title,
        artist:
            "MyMusic",
        album:
            "MyMusic"
    };
    if(item.cover){
        metadata.artwork = [
            {
                src:item.cover,
                sizes:"512x512",
                type:"image/jpeg"
            }
        ];
    }
    navigator.mediaSession.metadata =
        new MediaMetadata(
            metadata
        );
    try{
        navigator.mediaSession.setActionHandler(
            "play",
            ()=>{
                getCurrentMedia()?.play();
            }
        );
        navigator.mediaSession.setActionHandler(
            "pause",
            ()=>{
                getCurrentMedia()?.pause();
            }
        );
        navigator.mediaSession.setActionHandler(
            "previoustrack",
            previousTrack
        );
        navigator.mediaSession.setActionHandler(
            "nexttrack",
            nextTrack
        );
        navigator.mediaSession.setActionHandler(
            "seekbackward",
            ()=>{
                const media =
                    getCurrentMedia();
                if(media){
                    media.currentTime =
                        Math.max(
                            0,
                            media.currentTime -
                            10
                        );
                }
            }
        );
        navigator.mediaSession.setActionHandler(
            "seekforward",
            ()=>{
                const media =
                    getCurrentMedia();
                if(media){
                    media.currentTime =
                        Math.min(
                            media.duration,
                            media.currentTime +
                            10
                        );
                }
            }
        );
    }
    catch(error){
        console.log(
            "Media Session:",
            error
        );
    }
}
/* =========================================================
   OPEN ADD PANEL
========================================================= */
addBtn.onclick =
    ()=>{
        addPanel.scrollIntoView({
            behavior:"smooth"
        });
    };
/* =========================================================
   INITIALIZE
========================================================= */
async function initialize(){
    try{
        await openDatabase();
        library =
            await getAllTracks();
        renderLibrary();
        console.log(
            "MyMusic IndexedDB ready."
        );
    }
    catch(error){
        console.error(error);
        alert(
            "IndexedDB tidak tersedia di browser ini."
        );
    }
}
initialize();
/* =========================================================
   SERVICE WORKER
========================================================= */
if(
    "serviceWorker" in navigator
){
    window.addEventListener(
        "load",
        ()=>{
            navigator.serviceWorker
                .register(
                    "./sw.js"
                )
                .then(
                    registration =>
                        console.log(
                            "Service Worker:",
                            registration.scope
                        )
                )
                .catch(
                    error =>
                        console.log(
                            "Service Worker error:",
                            error
                        )
                );
        }
    );
}
