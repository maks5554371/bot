const express = require('express');
const { Voting, Vote, User } = require('../models');
const telegram = require('../services/telegram');

const router = express.Router();

// GET /api/voting — список всех голосований
router.get('/', async (req, res) => {
  try {
    const votings = await Voting.find().sort({ createdAt: -1 });
    res.json(votings);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/voting — создать и запустить голосование
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Название обязательно' });

    // Завершить предыдущие активные голосования
    await Voting.updateMany({ status: 'active' }, { status: 'finished', finished_at: new Date() });

    const voting = await Voting.create({ title });

    // Отправить уведомление всем активным пользователям через бота
    const users = await User.find({ is_active: true });
    const io = req.app.get('io');
    if (io) io.emit('voting_started', voting);

    // Рассылка через Telegram
    try {
      for (const user of users) {
        await telegram.sendVotingNotification(user.telegram_id, voting);
      }
    } catch (e) {
      console.error('Telegram broadcast error:', e.message);
    }

    res.status(201).json(voting);
  } catch (err) {
    console.error('Create voting error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/voting/:id/finish — завершить голосование
router.post('/:id/finish', async (req, res) => {
  try {
    const voting = await Voting.findByIdAndUpdate(
      req.params.id,
      { status: 'finished', finished_at: new Date() },
      { new: true }
    );
    if (!voting) return res.status(404).json({ error: 'Голосование не найдено' });

    // Подсчитать результаты
    const results = await getVotingResults(voting._id);

    // Обновить статистику пользователей
    for (const r of results.best) {
      await User.findByIdAndUpdate(r._id, { $inc: { 'stats.best_votes_received': r.count } });
    }
    for (const r of results.worst) {
      await User.findByIdAndUpdate(r._id, { $inc: { 'stats.worst_votes_received': r.count } });
    }

    const io = req.app.get('io');
    if (io) io.emit('voting_finished', { voting, results });

    // Рассылка результатов
    try {
      const users = await User.find({ is_active: true });
      for (const user of users) {
        await telegram.sendVotingResults(user.telegram_id, voting, results);
      }
    } catch (e) {
      console.error('Telegram results broadcast error:', e.message);
    }

    res.json({ voting, results });
  } catch (err) {
    console.error('Finish voting error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/voting/:id/results — результаты голосования
router.get('/:id/results', async (req, res) => {
  try {
    const voting = await Voting.findById(req.params.id);
    if (!voting) return res.status(404).json({ error: 'Голосование не найдено' });

    const results = await getVotingResults(voting._id);
    const totalVotes = await Vote.countDocuments({ voting_id: voting._id });

    res.json({ voting, results, totalVotes });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/voting/:id
router.delete('/:id', async (req, res) => {
  try {
    await Vote.deleteMany({ voting_id: req.params.id });
    await Voting.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

async function getVotingResults(votingId) {
  const bestAgg = await Vote.aggregate([
    { $match: { voting_id: votingId, category: 'best' } },
    { $group: { _id: '$candidate_id', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
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
        _id: '$user._id',
        first_name: '$user.first_name',
        telegram_username: '$user.telegram_username',
        count: 1,
      },
    },
  ]);

  const worstAgg = await Vote.aggregate([
    { $match: { voting_id: votingId, category: 'worst' } },
    { $group: { _id: '$candidate_id', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
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
        _id: '$user._id',
        first_name: '$user.first_name',
        telegram_username: '$user.telegram_username',
        count: 1,
      },
    },
  ]);

  return { best: bestAgg, worst: worstAgg };
}

module.exports = router;
