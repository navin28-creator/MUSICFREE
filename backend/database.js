
const Database = require('better-sqlite3');
const path = require('path');

// Create or open the database file
const dbPath = path.join(__dirname, 'dancing-monkey.db');
const db = new Database(dbPath);

// Enable foreign key relationships
db.pragma('foreign_keys = ON');

// Users table
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

// Songs table
db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT,
        audio_url TEXT NOT NULL,
        artwork_url TEXT,
        duration INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

// Playlists table
db.exec(`
    CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE
    );
`);

// Playlist songs relationship
db.exec(`
    CREATE TABLE IF NOT EXISTS playlist_songs (
        playlist_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        added_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (playlist_id, song_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id)
            ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id)
            ON DELETE CASCADE
    );
`);

// Liked songs relationship
db.exec(`
    CREATE TABLE IF NOT EXISTS liked_songs (
        user_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        liked_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, song_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id)
            ON DELETE CASCADE
    );
`);


const insertSong = db.prepare(`
    INSERT INTO songs (
        title, artist, album, audio_url, artwork_url, duration
    )
    VALUES (
        @title, @artist, @album, @audio_url, @artwork_url, @duration
    )
`);

const sampleSongs = [
    {
        title: 'Midnight City',
        artist: 'M83',
        album: 'Hurry Up, Were Dreaming',
        audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        artwork_url: '',
        duration: 240
    },
    {
        title: 'Neon Dreams',
        artist: 'DJ Nova',
        album: 'After Hours',
        audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        artwork_url: '',
        duration: 210
    },
    {
        title: 'Electric Nights',
        artist: 'Luna Beats',
        album: 'Electric Nights',
        audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        artwork_url: '',
        duration: 195
    }
];

const insertSampleSongs = db.transaction(() => {
    for (const song of sampleSongs) {
        const exists = db.prepare(`
            SELECT id FROM songs WHERE title = ? AND artist = ?
        `).get(song.title, song.artist);

        if (!exists) {
            insertSong.run(song);
        }
    }
});

insertSampleSongs();


console.log('Dancing Monkey database is ready!');

module.exports = db;
