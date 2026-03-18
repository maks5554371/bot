const express = require('express');
const { Message, User } = require('../models');
const telegram = require('../services/telegram');

const router = express.Router();

// GET /api/messages/conversations — список диалогов с последним сообщением и счётчиком непрочитанных
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      { $sort: { sent_at: -1 } },
      {
        $group: {
          _id: '$target_user_id',
          last_message: { $first: '$$ROOT' },
          unread_count: {
            $sum: { $cond: [{ $and: [{ $eq: ['$from_admin', false] }, { $eq: ['$read', false] }] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { 'last_message.sent_at': -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          user: { _id: 1, first_name: 1, telegram_username: 1, telegram_id: 1, team_id: 1 },
          last_message: { text: 1, from_admin: 1, sent_at: 1 },
          unread_count: 1,
          total: 1,
        },
      },
    ]);
    res.json(conversations);
  } catch (err) {
    console.error('Conversations error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/messages/read/:userId — пометить все сообщения от пользователя как прочитанные
router.post('/read/:userId', async (req, res) => {
  try {
    await Message.updateMany(
      { target_user_id: req.params.userId, from_admin: false, read: false },
      { $set: { read: true } },
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

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
