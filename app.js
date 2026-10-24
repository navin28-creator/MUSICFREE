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
const playerLoadingContainer = $("#player-loading-animation");
const favoriteIds = new Set(loadFavorites());
let currentSong = null;
let currentIndex = -1;
let shuffleEnabled = false;
let repeatMode = 1;
let toastTimer;
let loadingAnimationSongId = null;
let loadingAnimationStartedAt = 0;
let loadingAnimationHideTimer;
let supabaseClient = null;
let authenticatedRole = null;
let authGeneration = 0;
let editingSongId = null;

function showAuthScreen(message = "") {
  authGeneration += 1;
  authenticatedRole = null;
  $("#auth-screen").hidden = false;
  $("#app-shell").hidden = true;
  $("#now-playing").hidden = true;
  $("#auth-status").textContent = message;
  $("#auth-submit").disabled = !supabaseClient;
  $("#add-song-button").hidden = true;
  $("#mobile-add-song-button").hidden = true;
  audio.pause();
}

async function activateSession(user) {
  const generation = ++authGeneration;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (generation !== authGeneration) return;
  if (error) {
    throw new Error(`Could not verify this account's role: ${error.message}`);
  }
  const role = typeof data?.role === "string" ? data.role.trim().toLowerCase() : "";
  if (!["listener", "admin"].includes(role)) {
    throw new Error("This account has no valid role. Ask the administrator to check its access.");
  }

  authenticatedRole = role;

try {
  await loadRemoteSongs();
} catch (error) {
  console.error("Could not load the remote song library.", error);
  showToast(`Couldn't sync songs: ${error.message || "Please check your Supabase setup."}`);
  renderCards();
  if (!$("#search-view").classList.contains("hidden")) {
    renderSearchResults($("#search-input").value);
  }
}

const isAdmin = authenticatedRole === "admin";

  $("#account-role").textContent = isAdmin ? "Admin" : "Listener";
  $("#role-avatar").textContent = isAdmin ? "A" : "L";
  $("#add-song-button").hidden = !isAdmin;
  $("#mobile-add-song-button").hidden = !isAdmin;
  $("#auth-screen").hidden = true;
  $("#app-shell").hidden = false;
  $("#now-playing").hidden = false;
}

async function initializeAuthentication() {
  const authForm = $("#auth-form");
  const authStatus = $("#auth-status");
  const submitButton = $("#auth-submit");

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) return;

    submitButton.disabled = true;
    authStatus.textContent = "Signing in…";
    const formData = new FormData(authForm);
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: String(formData.get("email") || "").trim(),
        password: String(formData.get("password") || ""),
      });
      if (error) throw error;
      await activateSession(data.user);
    } catch (error) {
      console.error("Could not sign in.", error);
      showAuthScreen(error.message || "Sign in failed. Please try again.");
    } finally {
      submitButton.disabled = false;
    }
  });

  $("#sign-out-button").addEventListener("click", async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      showAuthScreen();
    } catch (error) {
      console.error("Could not sign out.", error);
      showToast("Could not sign out. Please try again.");
    }
  });

  const config = window.SUPABASE_CONFIG;
  if (!window.supabase?.createClient) {
    showAuthScreen("The Supabase client could not load. Check your connection and reload the page.");
    return;
  }
  if (!config?.url || !config?.anonKey) {
    showAuthScreen("Add your Supabase project URL and public anon key in supabase-config.js to enable sign in.");
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("Could not initialize Supabase.", error);
    showAuthScreen("Supabase could not be initialized. Check the project URL and public key in supabase-config.js.");
    return;
  }
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") showAuthScreen();
  });

  authStatus.textContent = "Checking your sign-in…";
  submitButton.disabled = true;
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data.session) {
      await activateSession(data.session.user);
    } else {
      showAuthScreen();
    }
  } catch (error) {
    console.error("Could not restore or verify the sign-in session.", error);
    showAuthScreen(error.message || "Could not verify this account's role.");
  }
}

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


function songToDatabaseRow(song) {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album || "Your uploads",
    composer: song.composer || song.artist,
    year: song.year || new Date().getFullYear(),
    url: song.url,
    cover_url: song.coverUrl || "",
    gradient: song.gradient ?? 0,
    duration: song.duration || "—:—",
    tags: song.tags || "added song",
  };
}

function songFromDatabase(row, index) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album || "Your uploads",
    composer: row.composer || row.artist,
    year: row.year || new Date().getFullYear(),
    url: row.url,
    coverUrl: row.cover_url || "",
    gradient: Number.isInteger(row.gradient) ? row.gradient : (9 + index) % 9,
    duration: row.duration || "—:—",
    tags: row.tags || "added song",
  };
}

function songFromChange(song, change) {
  return {
    ...song,
    title: change.title ?? song.title,
    artist: change.artist ?? song.artist,
    album: change.album ?? song.album,
    composer: change.composer ?? song.composer,
    year: change.year ?? song.year,
    coverUrl: change.cover_url ?? song.coverUrl,
    tags: change.tags ?? song.tags,
  };
}

async function loadRemoteSongs() {
  if (!supabaseClient) return;

  // Admins can migrate songs previously saved in this browser.
  if (authenticatedRole === "admin" && customSongs.length) {
    const localRows = customSongs.map(songToDatabaseRow);

    const { error: migrationError } = await supabaseClient
      .from("songs")
      .upsert(localRows, { onConflict: "id" });

    if (migrationError) {
      throw new Error(
        `Could not migrate your saved songs: ${migrationError.message}`
      );
    }
  }

  // Retrieve songs shared through Supabase.
  const [songsResult, changesResult] = await Promise.all([
    supabaseClient
      .from("songs")
      .select("*")
      .order("created_at", { ascending: true }),
    supabaseClient.from("song_changes").select("*"),
  ]);

  if (songsResult.error) {
    throw new Error(`Could not load songs from Supabase: ${songsResult.error.message}`);
  }
  if (changesResult.error) {
    throw new Error(`Could not load shared song edits: ${changesResult.error.message}`);
  }
  const remoteSongs = (songsResult.data || []).map(songFromDatabase);

  // Preserve browser-only songs until they have been migrated.
  const mergedSongs = new Map();
  remoteSongs.forEach(song => mergedSongs.set(song.id, song));
  customSongs.forEach(song => {
    if (!mergedSongs.has(song.id)) mergedSongs.set(song.id, song);
  });

  const changes = new Map((changesResult.data || []).map((change) => [change.song_id, change]));
  const allSongs = new Map(
    songs.filter((song) => !song.id.startsWith("custom-")).map((song) => [song.id, song])
  );
  const finalCustomSongs = [...mergedSongs.values()];

  finalCustomSongs.forEach((song) => allSongs.set(song.id, song));
  const finalSongs = [...allSongs.values()].flatMap((song) => {
    const change = changes.get(song.id);
    return change?.is_deleted ? [] : [change ? songFromChange(song, change) : song];
  });
  songs.splice(0, songs.length, ...finalSongs);

  customSongs.splice(
    0,
    customSongs.length,
    ...finalSongs.filter((song) => song.id.startsWith("custom-"))
  );

  // Keep the main playlist synchronized with the current library.
  playlists[0].songIds = songs.map(song => song.id);

  // Save the migration result locally only after a successful admin migration.
  if (authenticatedRole === "admin" && songsResult.data) {
    try {
      localStorage.setItem(
        "sonder-custom-songs",
        JSON.stringify(customSongs)
      );
    } catch (storageError) {
      console.warn("Could not update the local song cache.", storageError);
    }
  }

  renderCards();

  if (!$("#search-view").classList.contains("hidden")) {
    renderSearchResults($("#search-input").value);
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
    const stored = JSON.parse(
      localStorage.getItem("sonder-favorites") || "[]"
    );

    return Array.isArray(stored)
      ? stored.filter((id) => typeof id === "string")
      : [];
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
    <button class="quick-card" data-play="${song.id}" title="${escapeHtml(song.title)}" aria-label="Play ${escapeHtml(song.title)}">
      ${artwork(song)}
      <span class="quick-card-copy"><strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.artist)}</span></span>
      <span class="quick-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 5 12 7-12 7z"/></svg></span>
    </button>`).join("");

  $("#album-grid").innerHTML = songs.slice(0, 5).map((song) => `
    <button class="album-card" data-play="${song.id}" title="${escapeHtml(song.title)}" aria-label="Play ${escapeHtml(song.title)}">
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

function musicDirectorNames() {
  return [...new Set(songs.flatMap((song) => (song.composer || "").split(/\s*,\s*/).map((name) => name.trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b));
}

function songsForMusicDirector(musicDirector) {
  return songs.filter((song) => (song.composer || "").split(/\s*,\s*/).map((name) => name.trim()).includes(musicDirector));
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
      <span class="library-copy"><strong>${escapeHtml(artist)}</strong><small>Artist / singer · ${count} ${count === 1 ? "song" : "songs"}</small></span>
    </button>`;
  });
  const musicDirectorItems = musicDirectorNames().map((musicDirector) => {
    const count = songsForMusicDirector(musicDirector).length;
    return `<button class="library-item person-library music-director-library" data-person="${escapeHtml(musicDirector)}" data-person-role="music-director">
      <span class="artist-library-art">${escapeHtml(musicDirector.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase())}</span>
      <span class="library-copy"><strong>${escapeHtml(musicDirector)}</strong><small>Music director · ${count} ${count === 1 ? "song" : "songs"}</small></span>
    </button>`;
  });
  library.innerHTML = [...playlistItems, ...artistItems, ...musicDirectorItems].join("");
  applyLibraryFilter($(".filter-chip.selected")?.dataset.libraryFilter || "all");
}

function applyLibraryFilter(filter) {
  $$(".library-item", $("#library-list")).forEach((item) => {
    const isPlaylist = item.classList.contains("playlist-library");
    const isSinger = item.classList.contains("artist-library");
    const isMusicDirector = item.classList.contains("music-director-library");
    item.hidden = (filter === "playlist" && !isPlaylist && !item.classList.contains("liked-library")) ||
      (filter === "singer" && !isSinger) ||
      (filter === "music-director" && !isMusicDirector);
  });
}

function showCollection({ type, name, description, tracks }) {
  if (!tracks.length) {
    showToast("There are no songs in this collection yet.");
    return;
  }
  activeCollectionSongs = tracks;
  const hero = $("#collection-hero");
  const isPerson = type === "artist" || type === "music-director";
  const personRole = type === "music-director" ? "MUSIC DIRECTOR" : "ARTIST / SINGER";
  const coverMarkup = isPerson
    ? artwork(tracks[0], "collection-art artist-collection-art")
    : `<div class="collection-mosaic">${tracks.slice(0, 4).map((song) => artwork(song, "collection-mosaic-art")).join("")}</div>`;

  hero.classList.toggle("artist-collection", isPerson);
  $("#collection-cover").innerHTML = coverMarkup;
  $("#collection-kicker").textContent = isPerson ? personRole : `PLAYLIST · ${tracks.length} SONGS`;
  $("#collection-title").textContent = name;
  $("#collection-description").textContent = description || `${tracks.length} ${tracks.length === 1 ? "song" : "songs"} in your collection.`;
  $("#collection-list-title").textContent = isPerson ? "Songs in this collection" : "Songs in this playlist";
  $(".playlist-play-button").innerHTML = `Play ${isPerson ? "collection" : "playlist"} <span>▶</span>`;
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
  const isNewSong = currentSong?.id !== song.id;
  currentSong = song;
  currentIndex = songs.indexOf(song);
  if (autoplay && (isNewSong || loadingAnimationSongId === song.id)) showSongLoading(song);
  else stopSongLoading();
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
      if (currentSong?.id === song.id) {
        hideSongLoading(song.id);
        setPlayButton(true);
      }
    } catch (error) {
      if (currentSong?.id === song.id) {
        hideSongLoading(song.id);
        setPlayButton(false);
        showToast("This song couldn't be played. Check the Cloudinary link and try again.");
        console.error(`Could not play "${song.title}".`, error);
      }
    }
  } else {
    setPlayButton(false);
  }
}

function showSongLoading(song) {
  clearTimeout(loadingAnimationHideTimer);
  loadingAnimationSongId = song.id;
  loadingAnimationStartedAt = Date.now();
  playerLoadingContainer.classList.add("visible");
}

function hideSongLoading(songId) {
  if (loadingAnimationSongId !== songId) return;
  const visibleFor = Date.now() - loadingAnimationStartedAt;
  clearTimeout(loadingAnimationHideTimer);
  loadingAnimationHideTimer = setTimeout(() => {
    if (loadingAnimationSongId !== songId) return;
    playerLoadingContainer.classList.remove("visible");
    loadingAnimationSongId = null;
  }, Math.max(0, 180 - visibleFor));
}

function stopSongLoading() {
  if (!loadingAnimationSongId) return;
  clearTimeout(loadingAnimationHideTimer);
  playerLoadingContainer.classList.remove("visible");
  loadingAnimationSongId = null;
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
    resultContainer.innerHTML = `<p class="search-hint">A few good places to start</p><div class="quick-grid">${songs.slice(0, 6).map((song) => `<button class="quick-card" data-play="${song.id}" title="${escapeHtml(song.title)}">${artwork(song)}<span class="quick-card-copy"><strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.artist)}</span></span><span class="quick-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 5 12 7-12 7z"/></svg></span></button>`).join("")}</div><div class="search-section-heading">ALL SONGS · ${songs.length}</div>${trackMarkup(results)}`;
  } else if (!results.length) {
    resultContainer.innerHTML = `<p class="search-no-results">No songs found for “${escapeHtml(query.trim())}”. Try a different song or artist.</p>`;
  } else {
    resultContainer.innerHTML = `<div class="search-section-heading">${results.length} ${results.length === 1 ? "RESULT" : "RESULTS"}</div>${trackMarkup(results)}`;
  }
}

function trackMarkup(list) {
  return list.map((song) => {
    const liked = favoriteIds.has(song.id);
    const songIndex = songs.indexOf(song);
    const songActions = authenticatedRole === "admin"
      ? `<span class="track-actions"><button class="track-edit" data-edit-song="${escapeHtml(song.id)}" aria-label="Edit information for ${escapeHtml(song.title)}" title="Edit song information"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 5 3 3M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"/></svg></button><button class="track-delete" data-delete-song="${escapeHtml(song.id)}" aria-label="Delete ${escapeHtml(song.title)}" title="Delete song"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6"/></svg></button></span>`
      : "";
    return `<div class="track-row ${currentSong?.id === song.id ? "playing" : ""}" data-track="${song.id}" title="${escapeHtml(song.title)}">
      <span class="track-index">${String(songIndex + 1).padStart(2, "0")}<button class="row-play" data-play="${song.id}" aria-label="Play ${escapeHtml(song.title)}"><svg viewBox="0 0 24 24"><path d="m8 5 12 7-12 7z"/></svg></button></span>
      <div class="track-title-cell">${artwork(song, "track-thumb")}<span class="track-title-copy"><strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.artist)} · ${song.year}</span></span></div><span class="track-album"><strong>${escapeHtml(song.album)}</strong><small>${escapeHtml(song.composer)}</small></span>
      <button class="track-like ${liked ? "liked" : ""}" data-like="${song.id}" aria-label="${liked ? "Remove" : "Add"} ${escapeHtml(song.title)} ${liked ? "from" : "to"} liked songs"><svg viewBox="0 0 24 24"><path d="M12 20s-8-4.6-8-10a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 10c0 5.4-8 10-8 10Z"/></svg></button><span class="track-duration" data-duration="${song.id}">${song.duration}</span>${songActions}
    </div>`;
  }).join("");
}

function songChangeToDatabaseRow(song) {
  return {
    song_id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    composer: song.composer,
    year: song.year,
    cover_url: song.coverUrl,
    tags: song.tags,
    is_deleted: false,
  };
}

function updateSongCache() {
  try {
    localStorage.setItem("sonder-custom-songs", JSON.stringify(customSongs));
  } catch (error) {
    console.warn("Could not update the local song cache.", error);
  }
}

function renderSongChanges() {
  renderCards();
  if (!$("#search-view").classList.contains("hidden")) {
    renderSearchResults($("#search-input").value);
  }
  if (!$("#playlist-view").classList.contains("hidden")) {
    renderTrackList($("#playlist-track-list"), activeCollectionSongs);
  }
}

async function editSong(id) {
  if (authenticatedRole !== "admin") return;
  const song = songs.find((item) => item.id === id);
  if (!song) return;

  songFormError.textContent = "";
  setSongFormMode(song);
  addSongDialog.showModal();
  $("#song-title").focus();
}

async function deleteSong(id) {
  if (authenticatedRole !== "admin") return;
  const songIndex = songs.findIndex((song) => song.id === id);
  if (songIndex === -1) return;

  const song = songs[songIndex];
  if (!window.confirm(`Delete “${song.title}” from your library?`)) return;

  try {
    const { error } = await supabaseClient.from("song_changes").upsert({
      song_id: song.id,
      is_deleted: true,
    }, { onConflict: "song_id" });
    if (error) throw error;
  } catch (error) {
    console.error(`Could not delete "${song.title}" from Supabase.`, error);
    showToast(`Could not delete “${song.title}”. Please try again.`);
    return;
  }

  if (currentSong?.id === song.id) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    stopSongLoading();
    currentSong = null;
    currentIndex = -1;
    $("#player-title").textContent = "Pick a song";
    $("#player-artist").textContent = "Your collection is waiting";
    $("#player-cover").className = "cover-art cover-0 player-cover";
    $("#player-cover").innerHTML = '<span class="cover-number">01</span><span class="cover-sun"></span>';
    $("#current-time").textContent = "0:00";
    $("#duration").textContent = "0:00";
    $("#progress").value = "0";
    updateProgressFill($("#progress"));
  } else if (currentIndex > songIndex) {
    currentIndex -= 1;
  }

  songs.splice(songIndex, 1);
  const customSongIndex = customSongs.findIndex((item) => item.id === song.id);
  if (customSongIndex !== -1) customSongs.splice(customSongIndex, 1);
  favoriteIds.delete(song.id);
  playlists.forEach((playlist) => {
    playlist.songIds = playlist.songIds.filter((songId) => songId !== song.id);
  });
  activeCollectionSongs = activeCollectionSongs.filter((item) => item.id !== song.id);
  saveFavorites();

  updateSongCache();
  renderSongChanges();
  updatePlayingRows();
  setPlayButton(false);
  showToast(`Deleted “${song.title}”.`);
}

document.addEventListener("click", (event) => {
  const deleteTarget = event.target.closest("[data-delete-song]");
  const editTarget = event.target.closest("[data-edit-song]");
  const playTarget = event.target.closest("[data-play]");
  const likeTarget = event.target.closest("[data-like]");
  const trackTarget = event.target.closest("[data-track]");
  const playlistTarget = event.target.closest("[data-playlist-id]");
  const artistTarget = event.target.closest("[data-artist]");
  const personTarget = event.target.closest("[data-person]");
  const viewTarget = event.target.closest("[data-view]");
  if (deleteTarget) {
    deleteSong(deleteTarget.dataset.deleteSong);
    return;
  }
  if (editTarget) {
    editSong(editTarget.dataset.editSong);
    return;
  }
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
  if (personTarget) {
    const musicDirector = personTarget.dataset.person;
    showCollection({
      type: "music-director",
      name: musicDirector,
      tracks: songsForMusicDirector(musicDirector),
    });
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
const songUrlInput = $("#song-url");
const metadataLookupStatus = $("#metadata-lookup-status");
const songUrlLabel = $("#song-url-label");
const songFormSubmit = $("#song-form-submit");
const songFormTitle = $("#song-form-title");
const songFormDescription = $("#song-form-description");
const autoFilledMetadata = { title: "", artist: "", album: "" };
let metadataLookupTimer;
let metadataLookupController;
let pendingMetadataLookup = Promise.resolve();
let pendingMetadataUrl = "";

function getSongDetailsFromUrl(url) {
  let filename = new URL(url).pathname.split("/").pop() || "Untitled song";

  try {
    filename = decodeURIComponent(filename);
  } catch {
    filename = "Untitled song";
  }

  filename = filename.replace(/\.[^.]+$/, "").trim();
  const artistTitle = filename.match(/^(.+?)(?:\s+-\s+|_-_)(.+)$/);
  if (artistTitle) {
    return { title: artistTitle[2].trim(), artist: artistTitle[1].trim() };
  }

  return { title: filename.replace(/[_-]+/g, " ").trim(), artist: "" };
}

function setAutoFilledMetadata(field, value) {
  const input = addSongForm.elements.namedItem(field);
  if (!value || !(input instanceof HTMLInputElement)) return;

  const currentValue = input.value.trim();
  if (!currentValue || currentValue === autoFilledMetadata[field]) {
    input.value = value;
    autoFilledMetadata[field] = value;
  }
}

function normalizeMetadataText(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function lookupSongMetadata(url) {
  const { title, artist } = getSongDetailsFromUrl(url);
  const queryParts = [`recording:"${title.replace(/(["\\])/g, "\\$1")}"`];
  if (artist) queryParts.push(`artist:"${artist.replace(/(["\\])/g, "\\$1")}"`);

  const params = new URLSearchParams({
    query: queryParts.join(" AND "),
    fmt: "json",
    limit: "10",
  });
  const controller = new AbortController();
  metadataLookupController = controller;
  metadataLookupStatus.textContent = "Looking up song details on MusicBrainz…";

  try {
    const response = await fetch(`https://musicbrainz.org/ws/2/recording/?${params}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`MusicBrainz returned HTTP ${response.status}.`);

    const data = await response.json();
    if (songUrlInput.value.trim() !== url) return;
    const targetTitle = normalizeMetadataText(title);
    const matchingRecordings = (data.recordings || []).filter((result) =>
      normalizeMetadataText(result.title || "") === targetTitle &&
      Number(result.score) >= 80
    );
    const recording = matchingRecordings.find((result) => result.releases?.length) || matchingRecordings[0];

    if (!recording) {
      metadataLookupStatus.textContent = "No matching recording found. The filename is filled in; you can edit the details.";
      return;
    }

    const recordingArtist = (recording["artist-credit"] || [])
      .map((credit) => typeof credit === "string"
        ? credit
        : `${credit.name || credit.artist?.name || ""}${credit.joinphrase || ""}`)
      .join("")
      .trim();
    const album = recording.releases?.[0]?.title || "";

    setAutoFilledMetadata("title", recording.title);
    setAutoFilledMetadata("artist", recordingArtist);
    setAutoFilledMetadata("album", album);
    metadataLookupStatus.textContent = "Song details found. Review them before adding.";
  } catch (error) {
    if (error.name === "AbortError") return;
    console.warn("Could not look up song details on MusicBrainz.", error);
    metadataLookupStatus.textContent = "Metadata lookup is unavailable. The filename is filled in; you can edit the details.";
  }
}

songUrlInput.addEventListener("input", () => {
  clearTimeout(metadataLookupTimer);
  metadataLookupController?.abort();
  metadataLookupController = null;

  for (const field of Object.keys(autoFilledMetadata)) {
    const input = addSongForm.elements.namedItem(field);
    if (input instanceof HTMLInputElement && input.value.trim() === autoFilledMetadata[field]) {
      input.value = "";
    }
    autoFilledMetadata[field] = "";
  }

  const url = songUrlInput.value.trim();
  pendingMetadataUrl = url;
  if (!isCloudinaryAudioUrl(url)) {
    pendingMetadataLookup = Promise.resolve();
    metadataLookupStatus.textContent = "";
    return;
  }

  const filenameDetails = getSongDetailsFromUrl(url);
  setAutoFilledMetadata("title", filenameDetails.title);
  setAutoFilledMetadata("artist", filenameDetails.artist);
  metadataLookupStatus.textContent = "Looking up song details on MusicBrainz…";
  pendingMetadataLookup = new Promise((resolve) => {
    metadataLookupTimer = setTimeout(() => {
      lookupSongMetadata(url).finally(resolve);
    }, 500);
  });
});

addSongForm.addEventListener("reset", () => {
  clearTimeout(metadataLookupTimer);
  metadataLookupController?.abort();
  metadataLookupController = null;
  pendingMetadataLookup = Promise.resolve();
  pendingMetadataUrl = "";
  metadataLookupStatus.textContent = "";
  for (const field of Object.keys(autoFilledMetadata)) autoFilledMetadata[field] = "";
});

function setSongFormMode(song = null) {
  addSongForm.reset();
  editingSongId = song?.id || null;
  const editing = !!song;
  songUrlInput.disabled = editing;
  songUrlInput.required = !editing;
  songUrlLabel.hidden = editing;
  songUrlInput.hidden = editing;
  metadataLookupStatus.hidden = editing;
  songFormTitle.textContent = editing ? "Edit song information" : "Add a song";
  songFormDescription.textContent = editing
    ? "Update this song's title, artist, album, composer, year, tags, or cover art."
    : "Paste a Cloudinary audio link to look up its title, artist, and album. You can review or edit the details before adding it.";
  songFormSubmit.textContent = editing ? "Save changes" : "Add to library";

  if (!song) return;

  for (const [field, value] of Object.entries({
    title: song.title,
    artist: song.artist,
    album: song.album,
    composer: song.composer,
    year: song.year,
    tags: song.tags,
    coverUrl: song.coverUrl,
  })) {
    addSongForm.elements.namedItem(field).value = value ?? "";
  }
}

["#add-song-button", "#mobile-add-song-button"].forEach((selector) => $(selector).addEventListener("click", () => {
  if (authenticatedRole !== "admin") return;
  songFormError.textContent = "";
  setSongFormMode();
  addSongDialog.showModal();
  $("#song-url").focus();
}));
$$("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => addSongDialog.close()));
addSongDialog.addEventListener("click", (event) => {
  if (event.target === addSongDialog) addSongDialog.close();
});
addSongDialog.addEventListener("close", () => setSongFormMode());

addSongForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  songFormError.textContent = "";

  if (authenticatedRole !== "admin") {
    songFormError.textContent = "Only an admin account can change songs.";
    return;
  }

  let formData = new FormData(addSongForm);
  const url = String(formData.get("url") || "").trim();
  const coverUrl = String(formData.get("coverUrl") || "").trim();
  if (coverUrl && !isCloudinaryImageUrl(coverUrl)) {
    songFormError.textContent =
      "Cover art must be a secure Cloudinary image URL.";
    return;
  }

  const submitButton = addSongForm.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  try {
    if (editingSongId) {
      const song = songs.find((item) => item.id === editingSongId);
      if (!song) throw new Error("This song is no longer in the library. Reload and try again.");
      const title = String(formData.get("title") || "").trim();
      const artist = String(formData.get("artist") || "").trim();
      if (!title || !artist) throw new Error("Enter both a song title and artist.");

      const yearInput = String(formData.get("year") || "").trim();
      const year = yearInput ? Number(yearInput) : song.year;
      if (!Number.isInteger(year) || year < 1 || year > 9999) {
        throw new Error("Enter a valid year.");
      }
      const updatedSong = {
        ...song,
        title,
        artist,
        album: String(formData.get("album") || "").trim(),
        composer: String(formData.get("composer") || "").trim() || artist,
        year,
        tags: String(formData.get("tags") || "").trim(),
        coverUrl,
      };
      const { error } = await supabaseClient
        .from("song_changes")
        .upsert(songChangeToDatabaseRow(updatedSong), { onConflict: "song_id" });
      if (error) throw error;

      Object.assign(song, updatedSong);
      updateSongCache();
      if (currentSong?.id === song.id) {
        $("#player-title").textContent = song.title;
        $("#player-artist").textContent = `${song.artist} · ${song.album}`;
        const playerCover = $("#player-cover");
        playerCover.className = `cover-art cover-${song.gradient}${song.coverUrl ? " has-cover" : ""} player-cover`;
        playerCover.innerHTML = `${song.coverUrl ? `<img class="cover-image" src="${escapeHtml(song.coverUrl)}" alt="" referrerpolicy="no-referrer" />` : ""}<span class="cover-number">${String(song.gradient + 1).padStart(2, "0")}</span><span class="cover-sun"></span><span class="cover-title">${escapeHtml(song.title)}</span>`;
      }
      renderSongChanges();
      addSongDialog.close();
      showToast(`Updated “${song.title}”.`);
    } else {
      const submittedUrl = songUrlInput.value.trim();
      if (submittedUrl && submittedUrl === pendingMetadataUrl) {
        await pendingMetadataLookup;
        formData = new FormData(addSongForm);
      }
      if (!isCloudinaryAudioUrl(url)) {
        throw new Error("Enter a secure Cloudinary audio URL ending in a supported audio format, such as .mp3.");
      }
      if (songs.some((song) => song.url === url)) {
        throw new Error("That song is already in your library.");
      }
      const filename = getSongDetailsFromUrl(url).title;
      const title = String(formData.get("title") || "").trim() || filename || "Untitled song";
      const artist = String(formData.get("artist") || "").trim() || "Unknown artist";
      const song = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        artist,
        album: String(formData.get("album") || "").trim() || "Your uploads",
        composer: String(formData.get("composer") || "").trim() || artist,
        coverUrl,
        year: Number(formData.get("year")) || new Date().getFullYear(),
        url,
        gradient: (9 + customSongs.length) % 9,
        duration: "—:—",
        tags: String(formData.get("tags") || "").trim() || "added song",
      };
      const { error } = await supabaseClient
        .from("songs")
        .insert(songToDatabaseRow(song));
      if (error) throw error;

      customSongs.push(song);
      songs.push(song);
      playlists[0].songIds.push(song.id);
      updateSongCache();
      renderSongChanges();
      addSongForm.reset();
      addSongDialog.close();
      showToast(`Added “${song.title}” to your library.`);
      showView("home");
      setTimeout(() => {
        const addedTrack = $(`#track-list [data-track="${CSS.escape(song.id)}"]`);
        addedTrack?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  } catch (error) {
    console.error("Could not save the song change.", error);
    songFormError.textContent = error.message || "Please try again.";
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
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
audio.addEventListener("pause", () => {
  setPlayButton(false);
});
audio.addEventListener("playing", () => {
  if (currentSong) hideSongLoading(currentSong.id);
});
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
    hideSongLoading(currentSong.id);
    setPlayButton(false);
    showToast("Couldn't load this audio. Please check the Cloudinary asset link.");
  }
});

const themeToggle = $("#theme-toggle");
const themeLabel = themeToggle.querySelector("span:last-child");

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;

  const isLight = theme === "light";
  themeToggle.querySelector("span[aria-hidden='true']").textContent = isLight ? "☾" : "☀";
  themeToggle.setAttribute(
    "aria-label",
    isLight ? "Switch to dark mode" : "Switch to light mode"
  );
  themeLabel.textContent = isLight ? "Dark mode" : "Light mode";
}

function getSavedTheme() {
  try {
    return localStorage.getItem("sonder-theme") === "light" ? "light" : "dark";
  } catch (error) {
    console.warn("Could not read the saved theme.", error);
    return "dark";
  }
}

setTheme(getSavedTheme());

themeToggle.addEventListener("click", () => {
  const nextTheme =
    document.documentElement.dataset.theme === "light" ? "dark" : "light";

  setTheme(nextTheme);

  try {
    localStorage.setItem("sonder-theme", nextTheme);
  } catch (error) {
    console.warn("Could not save the selected theme.", error);
  }
});

audio.volume = Number($("#volume").value) / 100;
updateProgressFill($("#volume"));
updateProgressFill($("#progress"));
renderCards();
initializeAuthentication();
