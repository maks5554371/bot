const express = require('express');
const { User, PhotoReport, Team, Quest, Song, Voting, Vote } = require('../models');
const config = require('../config');
const spotify = require('../services/spotify');

const router = express.Router();

function isValidLatLng(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// POST /api/bot/register — регистрация участника из бота
router.post('/register', async (req, res) => {
  try {
    const { telegram_id, telegram_username, first_name } = req.body;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

    let user = await User.findOne({ telegram_id });
    if (user) {
      // Обновить данные
      user.telegram_username = telegram_username || user.telegram_username;
      user.first_name = first_name || user.first_name;
      await user.save();
      return res.json({ user, created: false });
    }

    user = await User.create({ telegram_id, telegram_username, first_name });

    const io = req.app.get('io');
    if (io) io.emit('new_user', user);

    res.status(201).json({ user, created: true });
  } catch (err) {
    console.error('Bot register error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/bot/photo — фото-отчёт из бота
router.post('/photo', async (req, res) => {
  try {
    const { telegram_id, file_id } = req.body;
    if (!telegram_id || !file_id) {
      return res.status(400).json({ error: 'telegram_id и file_id обязательны' });
    }

    const user = await User.findOne({ telegram_id });
    if (!user) return res.status(404).json({ error: 'Участник не найден' });
    if (!user.team_id) return res.status(400).json({ error: 'Участник не в команде' });

    const team = await Team.findById(user.team_id);
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });

    const activeQuest = await Quest.findOne({ status: 'active' }).select('clues').sort({ updatedAt: -1 });
    if (!activeQuest || !activeQuest.clues?.length) {
      return res.status(400).json({ error: 'Активный квест не найден' });
    }

    const report = await PhotoReport.create({
      team_id: team._id,
      user_id: user._id,
      clue_index: team.current_clue_index,
      telegram_file_id: file_id,
    });

    const populated = await PhotoReport.findById(report._id)
      .populate('team_id', 'name color')
      .populate('user_id', 'telegram_id telegram_username first_name');

    const io = req.app.get('io');
    if (io) io.emit('new_photo', populated);

    res.status(201).json(populated);
  } catch (err) {
    console.error('Bot photo error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/bot/location — обновление геопозиции
router.post('/location', async (req, res) => {
  try {
    const { telegram_id, lat, lng } = req.body;
    if (!telegram_id || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'telegram_id, lat, lng обязательны' });
    }

    if (!isValidLatLng(Number(lat), Number(lng))) {
      return res.status(400).json({ error: 'Неверные координаты' });
    }

    const user = await User.findOneAndUpdate(
      { telegram_id },
      { last_location: { lat: Number(lat), lng: Number(lng), updated_at: new Date() } },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'Участник не найден' });

    const io = req.app.get('io');
    if (io) io.emit('location_update', {
      user_id: user._id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      team_id: user.team_id,
      location: user.last_location,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Bot location error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/bot/message — сообщение от участника
router.post('/message', async (req, res) => {
  try {
    const { telegram_id, text } = req.body;
    const user = await User.findOne({ telegram_id });
    if (!user) return res.status(404).json({ error: 'Участник не найден' });

    const { Message } = require('../models');
    const msg = await Message.create({
      target_user_id: user._id,
      target_telegram_id: telegram_id,
      text,
      from_admin: false,
      delivered: true,
    });

    const io = req.app.get('io');
    if (io) io.emit('new_message', { ...msg.toObject(), user });

    res.status(201).json(msg);
  } catch (err) {
    console.error('Bot message error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/bot/song/search — поиск песни на Spotify (без добавления)
router.post('/song/search', async (req, res) => {
  try {
    const { query: songQuery } = req.body;
    if (!songQuery) {
      return res.status(400).json({ error: 'query обязателен' });
    }

    const track = await spotify.searchTrack(songQuery);
    if (!track) {
      return res.status(404).json({ error: 'not_found', message: 'Песня не найдена на Spotify' });
    }

    res.json({ track });
  } catch (err) {
    console.error('Bot song search error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/bot/song — добавить песню в плейлист (принимает track объект)
router.post('/song', async (req, res) => {
  try {
    const { telegram_id, track } = req.body;
    if (!telegram_id || !track || !track.spotify_id) {
      return res.status(400).json({ error: 'telegram_id и track обязательны' });
    }

    const user = await User.findOne({ telegram_id });
    if (!user) return res.status(404).json({ error: 'Участник не найден' });

    // Check duplicate
    const existing = await Song.findOne({ user_id: user._id, spotify_id: track.spotify_id });
    if (existing) {
      return res.status(400).json({
        error: 'duplicate',
        message: 'Эта песня уже есть в твоём списке',
        song: existing,
      });
    }

    // Add to Spotify playlist
    let addedToPlaylist = false;
    try {
      await spotify.addTrackToPlaylist(track.spotify_uri);
      addedToPlaylist = true;
    } catch (e) {
      console.error('Spotify add to playlist error:', e.message);
    }

    // Save to DB
    const song = await Song.create({
      user_id: user._id,
      telegram_id,
      ...track,
      added_to_playlist: addedToPlaylist,
    });

    const io = req.app.get('io');
    if (io) io.emit('new_song', { song, user });

    res.status(201).json({ song });
  } catch (err) {
    console.error('Bot song error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/bot/songs — список песен пользователя
router.get('/songs', async (req, res) => {
  try {
    const { telegram_id } = req.query;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

    const user = await User.findOne({ telegram_id: Number(telegram_id) });
    if (!user) return res.status(404).json({ error: 'Участник не найден' });

    const songs = await Song.find({ user_id: user._id }).sort({ createdAt: -1 });
    res.json({
      songs,
      count: songs.length,
    });
  } catch (err) {
    console.error('Bot songs list error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== PROFILE ====================

// GET /api/bot/profile — профиль пользователя
router.get('/profile', async (req, res) => {
  try {
    const { telegram_id } = req.query;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

    const user = await User.findOne({ telegram_id: Number(telegram_id) })
      .populate('team_id', 'name color');
    if (!user) return res.status(404).json({ error: 'Участник не найден' });

    res.json(user);
  } catch (err) {
    console.error('Bot profile error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/bot/profile/name — изменить имя
router.post('/profile/name', async (req, res) => {
  try {
    const { telegram_id, first_name } = req.body;
    if (!telegram_id || !first_name) {
      return res.status(400).json({ error: 'telegram_id и first_name обязательны' });
    }

    const user = await User.findOneAndUpdate(
      { telegram_id: Number(telegram_id) },
      { first_name: first_name.trim() },
      { new: true },
    );
    if (!user) return res.status(404).json({ error: 'Участник не найден' });

    const io = req.app.get('io');
    if (io) io.emit('user_updated', user);

    res.json({ ok: true, first_name: user.first_name });
  } catch (err) {
    console.error('Bot profile name error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/bot/leaderboard — топ по жизням
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ is_active: true })
      .select('first_name telegram_username lives level')
      .sort({ lives: -1, level: -1 })
      .limit(20);
    res.json(users);
  } catch (err) {
    console.error('Bot leaderboard error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ==================== VOTING ====================

// GET /api/bot/voting/active — текущее активное голосование
router.get('/voting/active', async (req, res) => {
  try {
    const voting = await Voting.findOne({ status: 'active' });
    if (!voting) return res.json({ voting: null });
    res.json({ voting });
  } catch (err) {
    console.error('Bot voting active error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/bot/voting/candidates — список кандидатов
router.get('/voting/candidates', async (req, res) => {
  try {
    const { telegram_id } = req.query;
    if (!telegram_id) return res.status(400).json({ error: 'telegram_id обязателен' });

    // Все активные пользователи кроме самого голосующего
    const candidates = await User.find({
      is_active: true,
      telegram_id: { $ne: Number(telegram_id) },
    }).select('_id first_name telegram_username telegram_id');

    res.json(candidates);
  } catch (err) {
    console.error('Bot voting candidates error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/bot/voting/vote — проголосовать
router.post('/voting/vote', async (req, res) => {
  try {
    const { telegram_id, candidate_id, category } = req.body;
    if (!telegram_id || !candidate_id || !category) {
      return res.status(400).json({ error: 'telegram_id, candidate_id и category обязательны' });
    }
    if (!['best', 'worst'].includes(category)) {
      return res.status(400).json({ error: 'category должен быть best или worst' });
    }

    const voting = await Voting.findOne({ status: 'active' });
    if (!voting) return res.status(400).json({ error: 'Нет активного голосования' });

    const voter = await User.findOne({ telegram_id });
    if (!voter) return res.status(404).json({ error: 'Участник не найден' });

    // Проверка: нельзя голосовать за себя
    if (voter._id.toString() === candidate_id) {
      return res.status(400).json({ error: 'Нельзя голосовать за себя' });
    }

    // Проверка: уже голосовал в этой категории
    const existing = await Vote.findOne({
      voting_id: voting._id,
      voter_id: voter._id,
      category,
    });
    if (existing) {
      return res.status(400).json({ error: 'already_voted', message: 'Ты уже голосовал в этой категории' });
    }

    const vote = await Vote.create({
      voting_id: voting._id,
      voter_telegram_id: telegram_id,
      voter_id: voter._id,
      candidate_id,
      category,
    });

    // Обновить статистику
    await User.findByIdAndUpdate(voter._id, { $inc: { 'stats.votes_cast': 1 } });

    const io = req.app.get('io');
    if (io) io.emit('new_vote', { voting_id: voting._id, category });

    res.status(201).json({ ok: true, vote });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'already_voted', message: 'Ты уже голосовал в этой категории' });
    }
    console.error('Bot vote error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
