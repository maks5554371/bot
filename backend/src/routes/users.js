const express = require('express');
const { User, Team } = require('../models');

const router = express.Router();

// GET /api/users/leaderboard/top — топ игроков
router.get('/leaderboard/top', async (req, res) => {
  try {
    const users = await User.find({ is_active: true })
      .select('first_name telegram_username lives experience level title coins stats team_id')
      .populate('team_id', 'name color')
      .sort({ lives: -1, experience: -1 })
      .limit(50);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/users — список всех участников
router.get('/', async (req, res) => {
  try {
    const users = await User.find().populate('team_id', 'name color').sort({ registered_at: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('team_id', 'name color');
    if (!user) return res.status(404).json({ error: 'Участник не найден' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PATCH /api/users/:id — обновить участника (назначить команду и т.д.)
router.patch('/:id', async (req, res) => {
  try {
    const { team_id, first_name, is_active, lives, experience, level, title, coins, inventory } = req.body;
    const update = {};
    if (team_id !== undefined) update.team_id = team_id;
    if (first_name !== undefined) update.first_name = first_name;
    if (is_active !== undefined) update.is_active = is_active;
    if (lives !== undefined) update.lives = lives;
    if (experience !== undefined) update.experience = experience;
    if (level !== undefined) update.level = level;
    if (title !== undefined) update.title = title;
    if (coins !== undefined) update.coins = coins;
    if (inventory !== undefined) update.inventory = inventory;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).populate('team_id', 'name color');
    if (!user) return res.status(404).json({ error: 'Участник не найден' });

    // Если назначена команда — добавить в team.members
    if (team_id) {
      // Удалить из старых команд
      await Team.updateMany({ members: user._id }, { $pull: { members: user._id } });
      // Добавить в новую
      await Team.findByIdAndUpdate(team_id, { $addToSet: { members: user._id } });
    }

    const io = req.app.get('io');
    if (io) io.emit('user_updated', user);

    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
