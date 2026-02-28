const express = require('express');
const { Song, User } = require('../models');

const router = express.Router();

// GET /api/songs — all songs (admin)
router.get('/', async (req, res) => {
  try {
    const songs = await Song.find()
      .populate('user_id', 'telegram_id telegram_username first_name team_id')
      .sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    console.error('Songs list error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/songs/stats — stats by user
router.get('/stats', async (req, res) => {
  try {
    const stats = await Song.aggregate([
      {
        $group: {
          _id: '$user_id',
          count: { $sum: 1 },
          songs: {
            $push: {
              name: '$name',
              artist: '$artist',
              external_url: '$external_url',
              cover_url: '$cover_url',
            },
          },
        },
      },
    ]);

    // Populate user info
    const userIds = stats.map((s) => s._id);
    const users = await User.find({ _id: { $in: userIds } }).select(
      'telegram_id telegram_username first_name'
    );
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    const result = stats.map((s) => ({
      user: userMap[s._id.toString()] || null,
      count: s.count,
      songs: s.songs,
    }));

    res.json(result);
  } catch (err) {
    console.error('Songs stats error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/songs/:id — delete song (admin)
router.delete('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Песня не найдена' });

    // Remove from Spotify playlist
    if (song.added_to_playlist) {
      try {
        const spotify = require('../services/spotify');
        await spotify.removeTrackFromPlaylist(song.spotify_uri);
      } catch (e) {
        console.error('Spotify remove error:', e.message);
      }
    }

    await Song.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Song delete error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
