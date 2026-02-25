const express = require('express');
const { Message, User } = require('../models');
const telegram = require('../services/telegram');

const router = express.Router();

// GET /api/messages?user_id=...
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.user_id) filter.target_user_id = req.query.user_id;

    const messages = await Message.find(filter)
      .populate('target_user_id', 'telegram_id telegram_username first_name')
      .sort({ sent_at: -1 })
      .limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/messages — отправить сообщение участнику
router.post('/', async (req, res) => {
  try {
    const { user_id, text } = req.body;
    if (!user_id || !text) {
      return res.status(400).json({ error: 'user_id и text обязательны' });
    }

    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: 'Участник не найден' });

    // Отправить через Telegram API
    let delivered = false;
    try {
      await telegram.sendMessage(user.telegram_id, `📩 <b>Сообщение от организатора:</b>\n\n${text}`);
      delivered = true;
    } catch (e) {
      console.error('Failed to deliver message:', e.message);
    }

    const message = await Message.create({
      target_user_id: user._id,
      target_telegram_id: user.telegram_id,
      text,
      from_admin: true,
      delivered,
    });

    const io = req.app.get('io');
    if (io) io.emit('message_sent', message);

    res.status(201).json(message);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
