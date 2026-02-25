const express = require('express');
const { User, PhotoReport, Team, Quest } = require('../models');

const router = express.Router();

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

    const user = await User.findOneAndUpdate(
      { telegram_id },
      { last_location: { lat, lng, updated_at: new Date() } },
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

module.exports = router;
