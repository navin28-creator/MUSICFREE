const songs = [
  { id: "venmegam", title: "Venmegam Pennaga", artist: "Hariharan", album: "Yaaradi Nee Mohini", composer: "Yuvan Shankar Raja", year: 2008, url: "https://res.cloudinary.com/z2uanzmi/video/upload/v1791808686/Venmegam-Pennaga.mp3", gradient: 0, duration: "—:—", tags: "tamil soft romantic" },
  { id: "venam", title: "Venaam Machan", artist: "Naresh Iyer, Velmurugan", album: "Oru Kal Oru Kannadi", composer: "Harris Jayaraj", year: 2012, url: "https://res.cloudinary.com/z2uanzmi/video/upload/v1791808694/Venaam-Machan.mp3", gradient: 1, duration: "—:—", tags: "tamil upbeat" },
  { id: "ambikapathy", title: "Ambikapathy", artist: "A. R. Rahman", album: "Ambikapathy", composer: "A. R. Rahman", year: 2013, url: "https://res.cloudinary.com/z2uanzmi/video/upload/v1791808737/Ambikapathy.mp3", gradient: 2, duration: "—:—", tags: "tamil soundtrack romantic" },
  { id: "agasatha", title: "Agasatha", artist: "Pradeep Kumar, Kalyani Nair", album: "Cuckoo", composer: "Santhosh Narayanan", year: 2014, url: "https://res.cloudinary.com/z2uanzmi/video/upload/v1791808752/Agasatha.mp3", gradient: 3, duration: "—:—", tags: "tamil acoustic" },
  { id: "enakenna", title: "Enakenna Yaarum Illaye", artist: "Anirudh Ravichander", album: "Aakko", composer: "Anirudh Ravichander", year: 2015, url: "https://res.cloudinary.com/z2uanzmi/video/upload/v1791808815/Enakenna_Yaarum_Illaye.mp3", gradient: 4, duration: "—:—", tags: "tamil slow romantic" },
  { id: "end-of-beginning", title: "End Of Beginning", artist: "Djo", album: "DECIDE", composer: "Djo", year: 2022, url: "https://res.cloudinary.com/z2uanzmi/video/upload/v1791808820/Djo_-_End_Of_Beginning_Lyrics.mp3", gradient: 5, duration: "—:—", tags: "indie pop nostalgia" },
  { id: "engaum", title: "Engaeyum Eppothum", artist: "S. P. B. Charan, Sunitha Sarathy", album: "Polladhavan", composer: "G. V. Prakash Kumar", year: 2007, url: "https://res.cloudinary.com/z2uanzmi/video/upload/v1791808823/Engaum-Epothum.mp3", gradient: 6, duration: "—:—", tags: "tamil melody" },
  { id: "engeyo", title: "Engeyo Partha Mayakkam", artist: "Udit Narayan", album: "Vaaranam Aayiram", composer: "Harris Jayaraj", year: 2008, url: "https://res.cloudinary.com/z2uanzmi/video/upload/v1791808828/Engeyo-Partha.mp3", gradient: 7, duration: "—:—", tags: "tamil romantic" },
  { id: "without-me", title: "Without Me", artist: "Eminem", album: "The Eminem Show", composer: "Eminem, Jeff Bass", year: 2002, url: "https://res.cloudinary.com/z2uanzmi/video/upload/v1791808837/Eminem_-_Without_Me__Jesusful.com.mp3", gradient: 8, duration: "—:—", tags: "hip-hop rap" },
];

const customSongs = loadCustomSongs();
songs.push(...customSongs);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const audio = $("#audio");
const favoriteIds = new Set(loadFavorites());
let currentSong = null;
let currentIndex = -1;
let shuffleEnabled = false;
let repeatMode = 0;
let toastTimer;

function loadCustomSongs() {
  try {
    const stored = JSON.parse(localStorage.getItem("sonder-custom-songs") || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((song) =>
      song &&
      typeof song.id === "string" &&
      song.id.startsWith("custom-") &&
      typeof song.title === "string" &&
      typeof song.artist === "string" &&
      typeof song.album === "string" &&
      typeof song.url === "string" &&
      isCloudinaryAudioUrl(song.url) &&
      (!song.coverUrl || isCloudinaryImageUrl(song.coverUrl))
    ).map((song, index) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      composer: typeof song.composer === "string" ? song.composer : song.artist,
      coverUrl: typeof song.coverUrl === "string" ? song.coverUrl : "",
      year: Number.isInteger(song.year) ? song.year : new Date().getFullYear(),
      url: song.url,
      gradient: (9 + index) % 9,
      duration: typeof song.duration === "string" ? song.duration : "—:—",
      tags: typeof song.tags === "string" ? song.tags : "added song",
    }));
  } catch (error) {
    console.warn("Could not load added songs from local storage.", error);
    return [];
  }
}

function isCloudinaryAudioUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.includes("/video/upload/") &&
      /\.(mp3|m4a|aac|ogg|wav|flac|opus)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function isCloudinaryImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.includes("/image/upload/") &&
      /\.(avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem("sonder-favorites") || "[]");
    return Array.isArray(stored) ? stored.filter((id) => songs.some((song) => song.id === id)) : [];
  } catch (error) {
    console.warn("Could not load saved songs from local storage.", error);
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem("sonder-favorites", JSON.stringify([...favoriteIds]));
  } catch (error) {
    console.warn("Could not save songs to local storage.", error);
    showToast("Your browser couldn't save this change.");
  }
}

function artwork(song, extraClass = "") {
  const shortTitle = song.title.length > 17 ? song.title.split(" ").slice(0, 2).join(" ") : song.title;
  const coverClass = song.coverUrl ? " has-cover" : "";
  const image = song.coverUrl ? `<img class="cover-image" src="${escapeHtml(song.coverUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : "";
  return `<div class="cover-art cover-${song.gradient}${coverClass} ${extraClass}" aria-hidden="true">${image}<span class="cover-number">${String(song.gradient + 1).padStart(2, "0")}</span><span class="cover-sun"></span><span class="cover-title ${shortTitle.length > 12 ? "cover-title-small" : ""}">${escapeHtml(shortTitle)}</span></div>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function renderCards() {
  renderLibrary();
  $("#quick-grid").innerHTML = songs.slice(0, 6).map((song) => `
    <button class="quick-card" data-play="${song.id}" aria-label="Play ${escapeHtml(song.title)}">
      ${artwork(song)}
      <span class="quick-card-copy"><strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.artist)}</span></span>
      <span class="quick-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 5 12 7-12 7z"/></svg></span>
    </button>`).join("");

  $("#album-grid").innerHTML = songs.slice(0, 5).map((song) => `
    <button class="album-card" data-play="${song.id}" aria-label="Play ${escapeHtml(song.title)}">
      ${artwork(song)}
      <span class="album-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 5 12 7-12 7z"/></svg></span>
      <span class="album-meta"><strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.artist)}</span></span>
    </button>`).join("");
  $("#track-total").textContent = `${songs.length} SONGS`;
  $("#footer-year").textContent = new Date().getFullYear();
  renderTrackList($("#track-list"), songs);
  renderLikedSongs();
}

const playlists = [
  { id: "mix", name: "Little bit of everything", description: "A little of every mood, all in one place.", songIds: songs.map((song) => song.id) },
  { id: "after-hours", name: "After hours", description: "Songs for when the day slows down.", songIds: ["enakenna", "end-of-beginning", "engeyo"] },
];
let activeCollectionSongs = [];

function artistNames() {
  return [...new Set(songs.flatMap((song) => song.artist.split(/\s*,\s*/).map((name) => name.trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b));
}

function songsForArtist(artist) {
  return songs.filter((song) => song.artist.split(/\s*,\s*/).map((name) => name.trim()).includes(artist));
}

function renderLibrary() {
  const library = $("#dynamic-library-list");
  const playlistItems = playlists.map((playlist, index) => {
    const cover = songs.find((song) => playlist.songIds.includes(song.id));
    return `<button class="library-item playlist-library" data-playlist-id="${playlist.id}">
      ${cover ? artwork(cover, "library-cover") : '<span class="playlist-art"><span></span><span></span><span></span><span></span></span>'}
      <span class="library-copy"><strong>${escapeHtml(playlist.name)}</strong><small>Playlist · ${playlist.songIds.length} songs</small></span>
    </button>`;
  });
  const artistItems = artistNames().map((artist) => {
    const count = songsForArtist(artist).length;
    return `<button class="library-item artist-library" data-artist="${escapeHtml(artist)}">
      <span class="artist-library-art">${escapeHtml(artist.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase())}</span>
      <span class="library-copy"><strong>${escapeHtml(artist)}</strong><small>Artist · ${count} ${count === 1 ? "song" : "songs"}</small></span>
    </button>`;
  });
  library.innerHTML = [...playlistItems, ...artistItems].join("");
  applyLibraryFilter($(".filter-chip.selected")?.dataset.libraryFilter || "all");
}

function applyLibraryFilter(filter) {
  $$(".library-item", $("#library-list")).forEach((item) => {
    const isPlaylist = item.classList.contains("playlist-library");
    const isArtist = item.classList.contains("artist-library");
    item.hidden = (filter === "playlist" && !isPlaylist && !item.classList.contains("liked-library")) ||
      (filter === "artist" && !isArtist);
  });
}

function showCollection({ type, name, description, tracks }) {
  if (!tracks.length) {
    showToast("There are no songs in this collection yet.");
    return;
  }
  activeCollectionSongs = tracks;
  const hero = $("#collection-hero");
  const isArtist = type === "artist";
  const coverMarkup = isArtist
    ? artwork(tracks[0], "collection-art artist-collection-art")
    : `<div class="collection-mosaic">${tracks.slice(0, 4).map((song) => artwork(song, "collection-mosaic-art")).join("")}</div>`;

  hero.classList.toggle("artist-collection", isArtist);
  $("#collection-cover").innerHTML = coverMarkup;
  $("#collection-kicker").textContent = isArtist ? "ARTIST" : `PLAYLIST · ${tracks.length} SONGS`;
  $("#collection-title").textContent = name;
  $("#collection-description").textContent = description || `${tracks.length} ${tracks.length === 1 ? "song" : "songs"} in your collection.`;
  $("#collection-list-title").textContent = isArtist ? "Popular songs" : "Songs in this playlist";
  $(".playlist-play-button").innerHTML = `Play ${isArtist ? "artist" : "playlist"} <span>▶</span>`;
  renderTrackList($("#playlist-track-list"), tracks);
  showView("playlist");
}

function renderTrackList(container, list) {
  container.innerHTML = trackMarkup(list);
}

function renderLikedSongs() {
  const liked = songs.filter((song) => favoriteIds.has(song.id));
  renderTrackList($("#liked-track-list"), liked);
  $("#liked-count").textContent = `Playlist · ${liked.length} songs`;
  $("#liked-description").textContent = `${liked.length} ${liked.length === 1 ? "song" : "songs"} you want to keep close.`;
  $("#like-current").classList.toggle("liked", !!currentSong && favoriteIds.has(currentSong.id));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2400);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function updateProgressFill(input) {
  const range = Number(input.max) - Number(input.min);
  const value = range ? ((Number(input.value) - Number(input.min)) / range) * 100 : 0;
  input.style.setProperty("--range-fill", `${value}%`);
}

async function playSong(song, autoplay = true) {
  currentSong = song;
  currentIndex = songs.indexOf(song);
  audio.src = song.url;
  audio.load();
  const playerCover = $("#player-cover");
  playerCover.className = `cover-art cover-${song.gradient}${song.coverUrl ? " has-cover" : ""} player-cover`;
  playerCover.innerHTML = `${song.coverUrl ? `<img class="cover-image" src="${escapeHtml(song.coverUrl)}" alt="" referrerpolicy="no-referrer" />` : ""}<span class="cover-number">${String(song.gradient + 1).padStart(2, "0")}</span><span class="cover-sun"></span><span class="cover-title">${escapeHtml(song.title)}</span>`;
  $("#player-title").textContent = song.title;
  $("#player-artist").textContent = `${song.artist} · ${song.album}`;
  $("#like-current").classList.toggle("liked", favoriteIds.has(song.id));
  $("#like-current").setAttribute("aria-label", favoriteIds.has(song.id) ? "Remove from liked songs" : "Like current song");
  updatePlayingRows();
  if (autoplay) {
    try {
      await audio.play();
      if (currentSong?.id === song.id) setPlayButton(true);
    } catch (error) {
      if (currentSong?.id === song.id) {
        setPlayButton(false);
        showToast("This song couldn't be played. Check the Cloudinary link and try again.");
        console.error(`Could not play "${song.title}".`, error);
      }
    }
  } else {
    setPlayButton(false);
  }
}

function setPlayButton(isPlaying) {
  $("#play-button").setAttribute("aria-label", isPlaying ? "Pause" : "Play");
  $(".play-icon").classList.toggle("hidden", isPlaying);
  $(".pause-icon").classList.toggle("hidden", !isPlaying);
  $("#hero-play").innerHTML = `<span class="play-triangle">${isPlaying ? "Ⅱ" : "▶"}</span> ${isPlaying ? "Pause the music" : "Play something good"}`;
}

function updatePlayingRows() {
  $$("[data-track]").forEach((row) => row.classList.toggle("playing", row.dataset.track === currentSong?.id));
}

function toggleFavorite(id) {
  if (favoriteIds.has(id)) favoriteIds.delete(id);
  else favoriteIds.add(id);
  saveFavorites();
  renderLikedSongs();
  $$(`[data-like="${CSS.escape(id)}"]`).forEach((button) => {
    const liked = favoriteIds.has(id);
    button.classList.toggle("liked", liked);
    button.setAttribute("aria-label", `${liked ? "Remove" : "Add"} ${songs.find((song) => song.id === id).title} ${liked ? "from" : "to"} liked songs`);
  });
  if (currentSong?.id === id) {
    $("#like-current").classList.toggle("liked", favoriteIds.has(id));
    $("#like-current").setAttribute("aria-label", favoriteIds.has(id) ? "Remove from liked songs" : "Like current song");
  }
}

function playNext(direction = 1) {
  if (!songs.length) return;
  if (shuffleEnabled && direction === 1 && songs.length > 1) {
    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) nextIndex = Math.floor(Math.random() * songs.length);
    currentIndex = nextIndex;
  } else {
    currentIndex = (currentIndex + direction + songs.length) % songs.length;
  }
  playSong(songs[currentIndex]);
}

function showView(name) {
  const views = { home: "#home-view", search: "#search-view", liked: "#liked-view", playlist: "#playlist-view", empty: "#empty-view" };
  Object.entries(views).forEach(([key, selector]) => $(selector).classList.toggle("hidden", key !== name));
  $$(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === name || (name === "liked" && link.dataset.view === "home")));
  if (name === "search") setTimeout(() => $("#search-input").focus(), 50);
  $(".content-area").scrollTop = 0;
}

function renderSearchResults(query = "") {
  const normalized = query.trim().toLowerCase();
  const results = normalized ? songs.filter((song) => `${song.title} ${song.artist} ${song.album} ${song.composer} ${song.year} ${song.tags}`.toLowerCase().includes(normalized)) : songs;
  const resultContainer = $("#search-results");
  if (!normalized) {
    resultContainer.innerHTML = `<p class="search-hint">A few good places to start</p><div class="quick-grid">${songs.slice(0, 6).map((song) => `<button class="quick-card" data-play="${song.id}">${artwork(song)}<span class="quick-card-copy"><strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.artist)}</span></span><span class="quick-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 5 12 7-12 7z"/></svg></span></button>`).join("")}</div><div class="search-section-heading">ALL SONGS · ${songs.length}</div>${trackMarkup(results)}`;
  } else if (!results.length) {
    resultContainer.innerHTML = `<p class="search-no-results">No songs found for “${escapeHtml(query.trim())}”. Try a different song or artist.</p>`;
  } else {
    resultContainer.innerHTML = `<div class="search-section-heading">${results.length} ${results.length === 1 ? "RESULT" : "RESULTS"}</div>${trackMarkup(results)}`;
  }
}

function trackMarkup(list) {
  return list.map((song) => {
    const liked = favoriteIds.has(song.id);
    return `<div class="track-row ${currentSong?.id === song.id ? "playing" : ""}" data-track="${song.id}">
      <span class="track-index">${String(songs.indexOf(song) + 1).padStart(2, "0")}<button class="row-play" data-play="${song.id}" aria-label="Play ${escapeHtml(song.title)}"><svg viewBox="0 0 24 24"><path d="m8 5 12 7-12 7z"/></svg></button></span>
      <div class="track-title-cell">${artwork(song, "track-thumb")}<span class="track-title-copy"><strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.artist)} · ${song.year}</span></span></div><span class="track-album" title="Composed by ${escapeHtml(song.composer)}"><strong>${escapeHtml(song.album)}</strong><small>${escapeHtml(song.composer)}</small></span>
      <button class="track-like ${liked ? "liked" : ""}" data-like="${song.id}" aria-label="${liked ? "Remove" : "Add"} ${escapeHtml(song.title)} ${liked ? "from" : "to"} liked songs"><svg viewBox="0 0 24 24"><path d="M12 20s-8-4.6-8-10a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 10c0 5.4-8 10-8 10Z"/></svg></button><span class="track-duration" data-duration="${song.id}">${song.duration}</span>
    </div>`;
  }).join("");
}

document.addEventListener("click", (event) => {
  const playTarget = event.target.closest("[data-play]");
  const likeTarget = event.target.closest("[data-like]");
  const trackTarget = event.target.closest("[data-track]");
  const playlistTarget = event.target.closest("[data-playlist-id]");
  const artistTarget = event.target.closest("[data-artist]");
  const viewTarget = event.target.closest("[data-view]");
  if (playTarget) {
    const song = songs.find((item) => item.id === playTarget.dataset.play);
    if (song) playSong(song);
    return;
  }
  if (likeTarget) {
    toggleFavorite(likeTarget.dataset.like);
    return;
  }
  if (playlistTarget) {
    const playlist = playlists.find((item) => item.id === playlistTarget.dataset.playlistId);
    if (playlist) showCollection({ type: "playlist", name: playlist.name, description: playlist.description, tracks: songs.filter((song) => playlist.songIds.includes(song.id)) });
    return;
  }
  if (artistTarget) {
    const artist = artistTarget.dataset.artist;
    showCollection({ type: "artist", name: artist, tracks: songsForArtist(artist) });
    return;
  }
  if (trackTarget) {
    const song = songs.find((item) => item.id === trackTarget.dataset.track);
    if (song) playSong(song);
    return;
  }
  if (viewTarget) {
    showView(viewTarget.dataset.view);
    return;
  }
  if (event.target.closest("[data-show-all]")) {
    showView("search");
    $("#search-input").value = "";
    renderSearchResults();
  }
});

$$(".nav-link").forEach((link) => link.addEventListener("click", () => {
  if (link.dataset.view === "search") renderSearchResults($("#search-input").value);
}));

$("#play-button").addEventListener("click", async () => {
  if (!currentSong) {
    await playSong(songs[0]);
    return;
  }
  if (audio.paused) {
    try {
      await audio.play();
      setPlayButton(true);
    } catch (error) {
      showToast("This song couldn't be played. Check the Cloudinary link and try again.");
      console.error(`Could not play "${currentSong.title}".`, error);
    }
  } else {
    audio.pause();
  }
});

$("#hero-play").addEventListener("click", () => {
  if (currentSong && !audio.paused) audio.pause();
  else if (currentSong) $("#play-button").click();
  else playSong(songs[0]);
});
$("#next-button").addEventListener("click", () => playNext(1));
$("#previous-button").addEventListener("click", () => {
  if (audio.currentTime > 3) audio.currentTime = 0;
  else playNext(-1);
});
$("#shuffle-button").addEventListener("click", () => {
  shuffleEnabled = !shuffleEnabled;
  $("#shuffle-button").classList.toggle("toggled", shuffleEnabled);
  showToast(shuffleEnabled ? "Shuffle is on" : "Shuffle is off");
});
$("#repeat-button").addEventListener("click", () => {
  repeatMode = (repeatMode + 1) % 3;
  $("#repeat-button").classList.toggle("toggled", repeatMode > 0);
  $("#repeat-button").setAttribute("aria-label", ["Repeat off", "Repeat all", "Repeat one"][repeatMode]);
  showToast(["Repeat is off", "Repeating all songs", "Repeating this song"][repeatMode]);
});
$("#like-current").addEventListener("click", () => {
  if (currentSong) toggleFavorite(currentSong.id);
  else showToast("Pick a song to add it to your favorites.");
});
$("#playlist-play").addEventListener("click", () => {
  if (activeCollectionSongs.length) playSong(activeCollectionSongs[0]);
});
const addSongDialog = $("#add-song-dialog");
const addSongForm = $("#add-song-form");
const songFormError = $("#song-form-error");

["#add-song-button", "#mobile-add-song-button"].forEach((selector) => $(selector).addEventListener("click", () => {
  songFormError.textContent = "";
  addSongDialog.showModal();
  $("#song-url").focus();
}));
$$("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => addSongDialog.close()));
addSongDialog.addEventListener("click", (event) => {
  if (event.target === addSongDialog) addSongDialog.close();
});
addSongForm.addEventListener("submit", (event) => {
  event.preventDefault();
  songFormError.textContent = "";

  const formData = new FormData(addSongForm);
  const url = String(formData.get("url") || "").trim();
  const coverUrl = String(formData.get("coverUrl") || "").trim();
  if (!isCloudinaryAudioUrl(url)) {
    songFormError.textContent = "Enter a secure Cloudinary audio URL ending in a supported audio format, such as .mp3.";
    return;
  }
  if (coverUrl && !isCloudinaryImageUrl(coverUrl)) {
    songFormError.textContent = "Cover art must be a secure Cloudinary image URL ending in .jpg, .png, .webp, or another supported image format.";
    return;
  }
  if (songs.some((song) => song.url === url)) {
    songFormError.textContent = "That song is already in your library.";
    return;
  }

  let filename = new URL(url).pathname.split("/").pop() || "Untitled song";
  try {
    filename = decodeURIComponent(filename);
  } catch {
    filename = "Untitled song";
  }
  filename = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const title = String(formData.get("title") || "").trim() || filename || "Untitled song";
  const artist = String(formData.get("artist") || "").trim() || "Unknown artist";
  const song = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    artist,
    album: String(formData.get("album") || "").trim() || "Your uploads",
    composer: artist,
    coverUrl,
    year: new Date().getFullYear(),
    url,
    gradient: (9 + customSongs.length) % 9,
    duration: "—:—",
    tags: "added song",
  };
  const updatedCustomSongs = [...customSongs, song];
  try {
    localStorage.setItem("sonder-custom-songs", JSON.stringify(updatedCustomSongs));
  } catch (error) {
    console.error("Could not save the added song to local storage.", error);
    songFormError.textContent = "This browser couldn't save the song. Check available storage and try again.";
    return;
  }

  customSongs.push(song);
  songs.push(song);
  playlists[0].songIds.push(song.id);
  renderCards();
  if (!$("#search-view").classList.contains("hidden")) renderSearchResults($("#search-input").value);
  addSongForm.reset();
  addSongDialog.close();
  showToast(`Added “${song.title}” to your library.`);
  showView("home");
  setTimeout(() => {
    const addedTrack = $(`#track-list [data-track="${CSS.escape(song.id)}"]`);
    addedTrack?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 50);
});
$("#about-button").addEventListener("click", () => showToast("A little listening room, made just for you."));
$("#go-back").addEventListener("click", () => {
  if (!$("#search-view").classList.contains("hidden")) showView("home");
  else if (!$("#liked-view").classList.contains("hidden") || !$("#playlist-view").classList.contains("hidden")) showView("home");
});
$("#go-forward").addEventListener("click", () => showView("search"));
$("#search-input").addEventListener("input", (event) => renderSearchResults(event.target.value));
$("#search-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const firstSong = songs.find((song) => `${song.title} ${song.artist} ${song.album} ${song.composer} ${song.year} ${song.tags}`.toLowerCase().includes(event.target.value.trim().toLowerCase()));
    if (firstSong && event.target.value.trim()) playSong(firstSong);
  }
});
$("#volume").addEventListener("input", (event) => {
  audio.volume = Number(event.target.value) / 100;
  updateProgressFill(event.target);
});
$("#progress").addEventListener("input", (event) => {
  if (Number.isFinite(audio.duration)) audio.currentTime = (Number(event.target.value) / 1000) * audio.duration;
  updateProgressFill(event.target);
});
$$("[data-library-filter]").forEach((button) => button.addEventListener("click", () => {
  $$("[data-library-filter]").forEach((item) => item.classList.toggle("selected", item === button));
  applyLibraryFilter(button.dataset.libraryFilter);
}));

document.addEventListener("error", (event) => {
  if (event.target instanceof HTMLImageElement && event.target.classList.contains("cover-image")) {
    event.target.hidden = true;
    event.target.closest(".cover-art")?.classList.remove("has-cover");
  }
}, true);

audio.addEventListener("loadedmetadata", () => {
  if (currentSong) {
    currentSong.duration = formatTime(audio.duration);
    $$(`[data-duration="${CSS.escape(currentSong.id)}"]`).forEach((node) => { node.textContent = currentSong.duration; });
    $("#duration").textContent = formatTime(audio.duration);
  }
});
audio.addEventListener("timeupdate", () => {
  $("#current-time").textContent = formatTime(audio.currentTime);
  $("#progress").value = audio.duration ? String((audio.currentTime / audio.duration) * 1000) : "0";
  updateProgressFill($("#progress"));
});
audio.addEventListener("play", () => setPlayButton(true));
audio.addEventListener("pause", () => setPlayButton(false));
audio.addEventListener("ended", () => {
  if (repeatMode === 2) {
    audio.currentTime = 0;
    audio.play().catch((error) => console.error("Could not repeat the current song.", error));
  } else if (repeatMode === 1 || currentIndex < songs.length - 1 || shuffleEnabled) {
    playNext(1);
  } else {
    setPlayButton(false);
  }
});
audio.addEventListener("error", () => {
  if (currentSong) {
    setPlayButton(false);
    showToast("Couldn't load this audio. Please check the Cloudinary asset link.");
  }
});

audio.volume = Number($("#volume").value) / 100;
updateProgressFill($("#volume"));
updateProgressFill($("#progress"));
renderCards();
