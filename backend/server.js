
const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Dancing Monkey backend is running!'
    });
});
app.get('/api/db-health', (req, res) => {
    try {
        const result = db.prepare(
            'SELECT sqlite_version() AS version'
        ).get();

        res.json({
            success: true,
            message: 'Database connected successfully!',
            sqliteVersion: result.version
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Database connection failed'
        });
    }
});


app.get('/api/songs', (req, res) => {
    try {
        const songs = db.prepare(`
            SELECT id, title, artist, album,
                   audio_url AS audioUrl,
                   artwork_url AS artworkUrl,
                   duration
            FROM songs
            ORDER BY id
        `).all();

        res.json({
            success: true,
            count: songs.length,
            songs: songs
        });
    } catch (error) {
        console.error('Failed to fetch songs:', error);

        res.status(500).json({
            success: false,
            message: 'Could not load songs'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Dancing Monkey API running at http://localhost:${PORT}`);
});
