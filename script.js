/* =========================================================
   MyMusic - Hybrid Music Player
   LOCAL + YOUTUBE
   ========================================================= */


/* =========================================================
   1. YOUTUBE API KEY
   ========================================================= */

const YOUTUBE_API_KEY = "AIzaSyCuRrZuamgjKNLBCN_tfTdfmLJsuuno78c";


/* =========================================================
   2. ELEMENT
   ========================================================= */

const audio = document.getElementById("audio");
const video = document.getElementById("video");
const youtubePlayer = document.getElementById("youtubePlayer");

const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const coverEl = document.getElementById("cover");

const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");

const playlistEl = document.getElementById("playlist");
const libraryCount = document.getElementById("libraryCount");

const statusText = document.getElementById("statusText");

const fileInput = document.getElementById("fileInput");

const youtubeInput =
    document.getElementById("youtubeInput");

const youtubeBtn =
    document.getElementById("youtubeBtn");

const youtubeSearch =
    document.getElementById("youtubeSearch");

const youtubeSearchBtn =
    document.getElementById("youtubeSearchBtn");

const youtubeResults =
    document.getElementById("youtubeResults");

const addBtn =
    document.getElementById("addBtn");

const addPanel =
    document.getElementById("addPanel");

const clearBtn =
    document.getElementById("clearBtn");

const shuffleBtn =
    document.getElementById("shuffleBtn");

const repeatBtn =
    document.getElementById("repeatBtn");


/* =========================================================
   3. STATE
   ========================================================= */

let library = [];

let currentIndex = -1;

let currentItem = null;

let currentObjectURL = null;

let shuffle = false;

let repeat = false;

let ytPlayer = null;

let youtubeAPIReady = false;

let pendingYoutube = null;


/* =========================================================
   4. INDEXEDDB
   ========================================================= */

const DB_NAME = "MyMusicDB";

const DB_VERSION = 1;

const STORE_NAME = "library";

let db = null;


function openDatabase() {

    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(
                DB_NAME,
                DB_VERSION
            );


        request.onupgradeneeded =
            event => {

                const database =
                    event.target.result;

                if (
                    !database.objectStoreNames.contains(
                        STORE_NAME
                    )
                ) {

                    database.createObjectStore(
                        STORE_NAME,
                        {
                            keyPath: "id"
                        }
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
            () => {

                reject(request.error);

            };

    });

}


/* =========================================================
   GET ALL
   ========================================================= */

function getAllSongs() {

    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                STORE_NAME,
                "readonly"
            );

        const store =
            transaction.objectStore(
                STORE_NAME
            );

        const request =
            store.getAll();


        request.onsuccess =
            () => {

                resolve(
                    request.result || []
                );

            };


        request.onerror =
            () => {

                reject(request.error);

            };

    });

}


/* =========================================================
   SAVE
   ========================================================= */

function saveSong(song) {

    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                STORE_NAME,
                "readwrite"
            );

        transaction
            .objectStore(STORE_NAME)
            .put(song);


        transaction.oncomplete =
            () => resolve();


        transaction.onerror =
            () => reject(
                transaction.error
            );

    });

}


/* =========================================================
   DELETE
   ========================================================= */

function deleteSong(id) {

    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                STORE_NAME,
                "readwrite"
            );

        transaction
            .objectStore(STORE_NAME)
            .delete(id);


        transaction.oncomplete =
            () => resolve();


        transaction.onerror =
            () => reject(
                transaction.error
            );

    });

}


/* =========================================================
   CLEAR DATABASE
   ========================================================= */

function clearDatabase() {

    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                STORE_NAME,
                "readwrite"
            );

        transaction
            .objectStore(STORE_NAME)
            .clear();


        transaction.oncomplete =
            () => resolve();


        transaction.onerror =
            () => reject(
                transaction.error
            );

    });

}


/* =========================================================
   INIT
   ========================================================= */

async function init() {

    try {

        await openDatabase();

        library =
            await getAllSongs();

        renderPlaylist();

        setupMediaSession();

        statusText.textContent =
            "Music Player Ready";

    } catch (error) {

        console.error(error);

        statusText.textContent =
            "Database Error";

    }

}


/* =========================================================
   5. LOCAL FILE
   ========================================================= */

fileInput.addEventListener(
    "change",
    async () => {

        const files =
            Array.from(
                fileInput.files || []
            );


        if (!files.length) {

            return;

        }


        statusText.textContent =
            "Menambahkan musik...";


        for (const file of files) {

            const song = {

                id:
                    crypto.randomUUID(),

                type:
                    "local",

                title:
                    file.name.replace(
                        /\.[^/.]+$/,
                        ""
                    ),

                artist:
                    "Local File",

                mime:
                    file.type,

                blob:
                    file,

                created:
                    Date.now()

            };


            await saveSong(song);

        }


        library =
            await getAllSongs();


        renderPlaylist();


        fileInput.value = "";


        statusText.textContent =
            "Musik berhasil ditambahkan";

    }
);


/* =========================================================
   6. YOUTUBE VIDEO ID
   ========================================================= */

function getYoutubeId(value) {

    value =
        String(value || "").trim();


    if (
        /^[A-Za-z0-9_-]{11}$/.test(value)
    ) {

        return value;

    }


    try {

        const url =
            new URL(value);


        if (
            url.hostname.includes(
                "youtu.be"
            )
        ) {

            return url.pathname
                .split("/")
                .filter(Boolean)[0];

        }


        const videoId =
            url.searchParams.get("v");


        if (videoId) {

            return videoId;

        }


        const parts =
            url.pathname
                .split("/")
                .filter(Boolean);


        const shortsIndex =
            parts.indexOf("shorts");


        if (
            shortsIndex >= 0 &&
            parts[shortsIndex + 1]
        ) {

            return parts[
                shortsIndex + 1
            ];

        }


        const embedIndex =
            parts.indexOf("embed");


        if (
            embedIndex >= 0 &&
            parts[embedIndex + 1]
        ) {

            return parts[
                embedIndex + 1
            ];

        }

    } catch (error) {

    }


    return null;

}


/* =========================================================
   7. ADD YOUTUBE LINK
   ========================================================= */

youtubeBtn.addEventListener(
    "click",
    async () => {

        const videoId =
            getYoutubeId(
                youtubeInput.value
            );


        if (!videoId) {

            alert(
                "Link YouTube tidak valid."
            );

            return;

        }


        await addYoutubeToLibrary(
            videoId,
            "YouTube Video",
            "YouTube",
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        );


        youtubeInput.value = "";

    }
);


/* =========================================================
   ADD YOUTUBE TO LIBRARY
   ========================================================= */

async function addYoutubeToLibrary(
    videoId,
    title,
    artist,
    thumbnail
) {

    const exists =
        library.some(
            item =>
                item.type === "youtube" &&
                item.videoId === videoId
        );


    if (exists) {

        alert(
            "Video tersebut sudah ada."
        );

        return null;

    }


    const item = {

        id:
            "youtube_" + videoId,

        type:
            "youtube",

        videoId,

        title,

        artist,

        thumbnail,

        created:
            Date.now()

    };


    await saveSong(item);


    library =
        await getAllSongs();


    renderPlaylist();


    return item;

}


/* =========================================================
   8. YOUTUBE SEARCH
   ========================================================= */

youtubeSearchBtn.addEventListener(
    "click",
    searchYoutube
);


youtubeSearch.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            searchYoutube();

        }

    }
);


async function searchYoutube() {

    const query =
        youtubeSearch.value.trim();


    if (!query) {

        return;

    }


    if (
        !YOUTUBE_API_KEY ||
        YOUTUBE_API_KEY ===
        "MASUKKAN_API_KEY_BARU_DI_SINI"
    ) {

        youtubeResults.innerHTML = `

            <div class="search-warning">

                ⚠️ API Key YouTube belum
                dimasukkan.

            </div>

        `;

        return;

    }


    youtubeResults.innerHTML =
        "🔎 Mencari YouTube...";


    try {

        const url =
            new URL(
                "https://www.googleapis.com/youtube/v3/search"
            );


        url.searchParams.set(
            "part",
            "snippet"
        );

        url.searchParams.set(
            "type",
            "video"
        );

        url.searchParams.set(
            "maxResults",
            "10"
        );

        url.searchParams.set(
            "q",
            query
        );

        url.searchParams.set(
            "key",
            YOUTUBE_API_KEY
        );


        const response =
            await fetch(url);


        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(
                `HTTP ${response.status}: ${text}`
            );

        }


        const data =
            await response.json();


        renderYoutubeResults(
            data.items || []
        );


    } catch (error) {

        console.error(error);

        youtubeResults.innerHTML = `

            <div class="search-warning">

                ❌ Pencarian gagal.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;

    }

}


/* =========================================================
   9. RENDER YOUTUBE SEARCH
   ========================================================= */

function renderYoutubeResults(items) {

    youtubeResults.innerHTML = "";


    if (!items.length) {

        youtubeResults.innerHTML =
            "Tidak ada hasil.";

        return;

    }


    items.forEach(item => {

        const videoId =
            item.id.videoId;

        const snippet =
            item.snippet;


        const thumbnail =
            snippet.thumbnails?.medium?.url ||
            `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;


        const row =
            document.createElement("div");


        row.className =
            "youtube-result";


        row.innerHTML = `

            <img
                src="${thumbnail}"
                alt=""
            >

            <div class="yt-info">

                <strong>
                    ${escapeHtml(
                        snippet.title
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        snippet.channelTitle
                    )}
                </span>

                <div class="yt-actions">

                    <button class="yt-play">
                        ▶ Play
                    </button>

                    <button class="yt-add">
                        ＋ Playlist
                    </button>

                </div>

            </div>

        `;


        row
            .querySelector(".yt-play")
            .addEventListener(
                "click",
                () => {

                    playYoutube(
                        videoId,
                        snippet.title,
                        snippet.channelTitle,
                        thumbnail
                    );

                }
            );


        row
            .querySelector(".yt-add")
            .addEventListener(
                "click",
                async () => {

                    await addYoutubeToLibrary(
                        videoId,
                        snippet.title,
                        snippet.channelTitle,
                        thumbnail
                    );

                }
            );


        youtubeResults.appendChild(row);

    });

}


/* =========================================================
   10. YOUTUBE API READY
   ========================================================= */

window.onYouTubeIframeAPIReady =
    function () {

        youtubeAPIReady = true;


        if (pendingYoutube) {

            const data =
                pendingYoutube;

            pendingYoutube = null;


            playYoutube(
                data.videoId,
                data.title,
                data.artist,
                data.thumbnail
            );

        }

    };


/* =========================================================
   11. PLAY YOUTUBE
   ========================================================= */

function playYoutube(
    videoId,
    title = "YouTube",
    artist = "YouTube",
    thumbnail = ""
) {

    stopLocal();


    currentItem = {

        id:
            "youtube_" + videoId,

        type:
            "youtube",

        videoId,

        title,

        artist,

        thumbnail

    };


    titleEl.textContent =
        title;


    artistEl.textContent =
        artist;


    if (thumbnail) {

        coverEl.innerHTML = `

            <img
                src="${thumbnail}"
                alt=""
            >

        `;

    } else {

        coverEl.innerHTML =
            "<span>▶</span>";

    }


    statusText.textContent =
        "YouTube Online";


    updateMediaSession(
        currentItem
    );


    if (!youtubeAPIReady) {

        pendingYoutube = {

            videoId,
            title,
            artist,
            thumbnail

        };

        statusText.textContent =
            "Menunggu YouTube...";

        return;

    }


    youtubePlayer.style.display =
        "block";


    if (ytPlayer) {

        ytPlayer.loadVideoById(
            videoId
        );

        return;

    }


    ytPlayer =
        new YT.Player(
            "youtubePlayer",
            {

                width: "100%",

                height: "100%",

                videoId,

                playerVars: {

                    autoplay: 1,

                    controls: 1,

                    playsinline: 1,

                    rel: 0

                },

                events: {

                    onReady:
                        event => {

                            event.target
                                .playVideo();

                        },

                    onStateChange:
                        onYoutubeState,

                    onError:
                        event => {

                            console.error(
                                "YouTube Error:",
                                event.data
                            );

                            statusText.textContent =
                                "YouTube Error " +
                                event.data;

                        }

                }

            }
        );

}


/* =========================================================
   12. YOUTUBE STATE
   ========================================================= */

function onYoutubeState(event) {

    if (
        event.data ===
        YT.PlayerState.PLAYING
    ) {

        playBtn.textContent =
            "⏸";

        statusText.textContent =
            "YouTube Online";

    }


    if (
        event.data ===
        YT.PlayerState.PAUSED
    ) {

        playBtn.textContent =
            "▶";

    }


    if (
        event.data ===
        YT.PlayerState.ENDED
    ) {

        playBtn.textContent =
            "▶";

        nextTrack();

    }

}


/* =========================================================
   13. PLAY LOCAL
   ========================================================= */

async function playLocal(item) {

    stopYoutube();


    if (currentObjectURL) {

        URL.revokeObjectURL(
            currentObjectURL
        );

        currentObjectURL = null;

    }


    currentObjectURL =
        URL.createObjectURL(
            item.blob
        );


    audio.src =
        currentObjectURL;


    titleEl.textContent =
        item.title;


    artistEl.textContent =
        item.artist ||
        "Local File";


    coverEl.innerHTML =
        "<span>♪</span>";


    statusText.textContent =
        "Local Music";


    updateMediaSession(
        item
    );


    try {

        await audio.play();

        playBtn.textContent =
            "⏸";

    } catch (error) {

        console.log(error);

        playBtn.textContent =
            "▶";

    }


    progress.value = 0;

    currentTimeEl.textContent =
        "0:00";

    durationEl.textContent =
        "0:00";

}


/* =========================================================
   14. PLAY ITEM
   ========================================================= */

async function playItem(index) {

    if (
        index < 0 ||
        index >= library.length
    ) {

        return;

    }


    currentIndex =
        index;


    currentItem =
        library[index];


    highlightCurrent();


    if (
        currentItem.type ===
        "youtube"
    ) {

        playYoutube(
            currentItem.videoId,
            currentItem.title,
            currentItem.artist,
            currentItem.thumbnail
        );

    } else {

        await playLocal(
            currentItem
        );

    }

}


/* =========================================================
   15. STOP LOCAL
   ========================================================= */

function stopLocal() {

    audio.pause();

    audio.removeAttribute(
        "src"
    );

    audio.load();


    if (currentObjectURL) {

        URL.revokeObjectURL(
            currentObjectURL
        );

        currentObjectURL = null;

    }

}


/* =========================================================
   16. STOP YOUTUBE
   ========================================================= */

function stopYoutube() {

    if (!ytPlayer) {

        return;

    }


    try {

        ytPlayer.stopVideo();

    } catch (error) {

    }

}


/* =========================================================
   17. PLAY / PAUSE
   ========================================================= */

playBtn.addEventListener(
    "click",
    async () => {

        if (!currentItem) {

            if (library.length) {

                await playItem(0);

            }

            return;

        }


        if (
            currentItem.type ===
            "youtube"
        ) {

            if (!ytPlayer) {

                playYoutube(
                    currentItem.videoId,
                    currentItem.title,
                    currentItem.artist,
                    currentItem.thumbnail
                );

                return;

            }


            const state =
                ytPlayer.getPlayerState();


            if (
                state ===
                YT.PlayerState.PLAYING
            ) {

                ytPlayer.pauseVideo();

            } else {

                ytPlayer.playVideo();

            }


            return;

        }


        if (audio.paused) {

            try {

                await audio.play();

                playBtn.textContent =
                    "⏸";

            } catch (error) {

                console.error(error);

            }

        } else {

            audio.pause();

            playBtn.textContent =
                "▶";

        }

    }
);


/* =========================================================
   18. PREVIOUS
   ========================================================= */

prevBtn.addEventListener(
    "click",
    () => {

        if (!library.length) {

            return;

        }


        let index =
            currentIndex - 1;


        if (index < 0) {

            index =
                library.length - 1;

        }


        playItem(index);

    }
);


/* =========================================================
   19. NEXT
   ========================================================= */

nextBtn.addEventListener(
    "click",
    nextTrack
);


function nextTrack() {

    if (!library.length) {

        return;

    }


    let index;


    if (shuffle) {

        index =
            Math.floor(
                Math.random() *
                library.length
            );

    } else {

        index =
            currentIndex + 1;


        if (
            index >= library.length
        ) {

            if (repeat) {

                index = 0;

            } else {

                index =
                    library.length - 1;

            }

        }

    }


    playItem(index);

}


/* =========================================================
   20. AUDIO EVENTS
   ========================================================= */

audio.addEventListener(
    "loadedmetadata",
    () => {

        if (
            isFinite(audio.duration)
        ) {

            durationEl.textContent =
                formatTime(
                    audio.duration
                );

        }

    }
);


audio.addEventListener(
    "timeupdate",
    () => {

        if (
            !isFinite(audio.duration) ||
            audio.duration <= 0
        ) {

            return;

        }


        progress.value =
            (
                audio.currentTime /
                audio.duration
            ) * 100;


        currentTimeEl.textContent =
            formatTime(
                audio.currentTime
            );

    }
);


audio.addEventListener(
    "play",
    () => {

        playBtn.textContent =
            "⏸";

    }
);


audio.addEventListener(
    "pause",
    () => {

        playBtn.textContent =
            "▶";

    }
);


audio.addEventListener(
    "ended",
    () => {

        nextTrack();

    }
);


/* =========================================================
   21. SEEK
   ========================================================= */

progress.addEventListener(
    "input",
    () => {

        if (
            !isFinite(audio.duration)
        ) {

            return;

        }


        audio.currentTime =
            (
                Number(
                    progress.value
                ) / 100
            ) *
            audio.duration;

    }
);


/* =========================================================
   22. SHUFFLE
   ========================================================= */

shuffleBtn.addEventListener(
    "click",
    () => {

        shuffle =
            !shuffle;

        shuffleBtn.classList.toggle(
            "active",
            shuffle
        );

    }
);


/* =========================================================
   23. REPEAT
   ========================================================= */

repeatBtn.addEventListener(
    "click",
    () => {

        repeat =
            !repeat;

        repeatBtn.classList.toggle(
            "active",
            repeat
        );

    }
);


/* =========================================================
   24. DELETE
   ========================================================= */

clearBtn.addEventListener(
    "click",
    async () => {

        if (!library.length) {

            return;

        }


        const ok =
            confirm(
                "Hapus semua lagu?"
            );


        if (!ok) {

            return;

        }


        stopLocal();

        stopYoutube();


        await clearDatabase();


        library = [];

        currentIndex = -1;

        currentItem = null;


        titleEl.textContent =
            "Belum ada lagu";


        artistEl.textContent =
            "Tambahkan musik untuk mulai";


        coverEl.innerHTML =
            "<span>♪</span>";


        renderPlaylist();

    }
);


/* =========================================================
   25. DELETE INDIVIDUAL
   ========================================================= */

async function deleteItem(index) {

    const item =
        library[index];


    if (!item) {

        return;

    }


    await deleteSong(
        item.id
    );


    if (
        currentItem &&
        currentItem.id ===
        item.id
    ) {

        stopLocal();

        stopYoutube();

        currentItem = null;

        currentIndex = -1;

    }


    library =
        await getAllSongs();


    renderPlaylist();

}


/* =========================================================
   26. RENDER PLAYLIST
   ========================================================= */

function renderPlaylist() {

    playlistEl.innerHTML = "";


    libraryCount.textContent =
        library.length +
        (
            library.length === 1
            ? " lagu"
            : " lagu"
        );


    if (!library.length) {

        playlistEl.innerHTML = `

            <div class="empty">

                🎵 Belum ada lagu.

                <br><br>

                Tambahkan MP3/WAV/MP4
                atau cari YouTube.

            </div>

        `;

        return;

    }


    library.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "song";


            if (
                index === currentIndex
            ) {

                row.classList.add(
                    "current"
                );

            }


            const image =
                item.type === "youtube"
                ? `
                    <img
                        src="${item.thumbnail}"
                        alt=""
                    >
                  `
                : `
                    <span>♪</span>
                  `;


            row.innerHTML = `

                <div class="song-cover">

                    ${image}

                </div>


                <div class="song-info">

                    <strong>
                        ${escapeHtml(
                            item.title
                        )}
                    </strong>

                    <span>

                        ${
                            item.type === "youtube"
                            ? "▶ YouTube"
                            : "📁 Lokal"
                        }

                        ·

                        ${escapeHtml(
                            item.artist ||
                            ""
                        )}

                    </span>

                </div>


                <button
                    class="song-delete"
                    title="Hapus"
                >
                    ⋯
                </button>

            `;


            row.addEventListener(
                "click",
                event => {

                    if (
                        event.target.closest(
                            ".song-delete"
                        )
                    ) {

                        return;

                    }


                    playItem(index);

                }
            );


            row
                .querySelector(
                    ".song-delete"
                )
                .addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        deleteItem(index);

                    }
                );


            playlistEl.appendChild(row);

        }
    );

}


/* =========================================================
   27. HIGHLIGHT
   ========================================================= */

function highlightCurrent() {

    const rows =
        playlistEl.querySelectorAll(
            ".song"
        );


    rows.forEach(
        (row, index) => {

            row.classList.toggle(
                "current",
                index === currentIndex
            );

        }
    );

}


/* =========================================================
   28. MEDIA SESSION
   ========================================================= */

function setupMediaSession() {

    if (
        !("mediaSession" in navigator)
    ) {

        return;

    }


    try {

        navigator.mediaSession
            .setActionHandler(
                "play",
                () => {

                    if (
                        currentItem?.type ===
                        "youtube"
                    ) {

                        if (ytPlayer) {

                            ytPlayer.playVideo();

                        }

                    } else {

                        audio.play();

                    }

                }
            );


        navigator.mediaSession
            .setActionHandler(
                "pause",
                () => {

                    if (
                        currentItem?.type ===
                        "youtube"
                    ) {

                        if (ytPlayer) {

                            ytPlayer.pauseVideo();

                        }

                    } else {

                        audio.pause();

                    }

                }
            );


        navigator.mediaSession
            .setActionHandler(
                "nexttrack",
                nextTrack
            );


        navigator.mediaSession
            .setActionHandler(
                "previoustrack",
                () => {

                    prevBtn.click();

                }
            );

    } catch (error) {

        console.log(
            "Media Session:",
            error
        );

    }

}


/* =========================================================
   29. MEDIA METADATA
   ========================================================= */

function updateMediaSession(item) {

    if (
        !("mediaSession" in navigator)
    ) {

        return;

    }


    try {

        const artwork =
            item.thumbnail
            ? [
                {
                    src:
                        item.thumbnail,
                    sizes:
                        "480x360",
                    type:
                        "image/jpeg"
                }
            ]
            : [];


        navigator.mediaSession.metadata =
            new MediaMetadata({

                title:
                    item.title,

                artist:
                    item.artist ||
                    "MyMusic",

                album:
                    item.type === "youtube"
                    ? "YouTube"
                    : "MyMusic",

                artwork

            });

    } catch (error) {

        console.log(error);

    }

}


/* =========================================================
   30. FORMAT TIME
   ========================================================= */

function formatTime(seconds) {

    if (
        !isFinite(seconds)
    ) {

        return "0:00";

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    const secs =
        Math.floor(
            seconds % 60
        );


    return (
        minutes +
        ":" +
        String(secs)
            .padStart(2, "0")
    );

}


/* =========================================================
   31. ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
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
   32. ADD PANEL
   ========================================================= */

addBtn.addEventListener(
    "click",
    () => {

        addPanel.classList.toggle(
            "open"
        );

    }
);


/* =========================================================
   33. VIDEO ELEMENT DISABLED
   ========================================================= */

video.style.display = "none";


/* =========================================================
   34. SERVICE WORKER
   ========================================================= */

if (
    "serviceWorker" in navigator
) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("sw.js")
                .catch(
                    error => {

                        console.log(
                            "Service Worker:",
                            error
                        );

                    }
                );

        }
    );

}


/* =========================================================
   35. START
   ========================================================= */

init();
