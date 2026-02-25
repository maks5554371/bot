const express = require('express');
const { Team, User } = require('../models');

const router = express.Router();

// GET /api/teams
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('members', 'telegram_id telegram_username first_name last_location is_active')
      .populate('quest_id', 'title status')
      .sort({ createdAt: -1 });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/teams
router.post('/', async (req, res) => {
  try {
    const { name, color, quest_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Название команды обязательно' });

    const team = await Team.create({ name, color, quest_id });
    const io = req.app.get('io');
    if (io) io.emit('team_created', team);
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PATCH /api/teams/:id
router.patch('/:id', async (req, res) => {
  try {
    const { name, color, quest_id, current_clue_index } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (color !== undefined) update.color = color;
    if (quest_id !== undefined) update.quest_id = quest_id;
    if (current_clue_index !== undefined) update.current_clue_index = current_clue_index;

    const team = await Team.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('members', 'telegram_id telegram_username first_name last_location is_active');
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });

    const io = req.app.get('io');
    if (io) io.emit('team_updated', team);
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/teams/:id/members — добавить участников в команду
router.post('/:id/members', async (req, res) => {
  try {
    const { user_ids } = req.body; // array of user ObjectIds
    if (!Array.isArray(user_ids)) return res.status(400).json({ error: 'user_ids должен быть массивом' });

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });

    // Убрать пользователей из старых команд
    await Team.updateMany(
      { members: { $in: user_ids } },
      { $pull: { members: { $in: user_ids } } }
    );

    // Добавить в новую команду
    team.members = [...new Set([...team.members.map(String), ...user_ids])];
    await team.save();

    // Обновить team_id у пользователей
    await User.updateMany(
      { _id: { $in: user_ids } },
      { team_id: team._id }
    );

    const populated = await Team.findById(team._id)
      .populate('members', 'telegram_id telegram_username first_name last_location is_active');

    const io = req.app.get('io');
    if (io) io.emit('team_updated', populated);
    res.json(populated);
  } catch (err) {
    console.error('Error adding members:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/teams/:id
router.delete('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });

    // Очистить team_id у участников
    await User.updateMany({ team_id: team._id }, { team_id: null });
    await team.deleteOne();

    const io = req.app.get('io');
    if (io) io.emit('team_deleted', { id: req.params.id });
    res.json({ message: 'Команда удалена' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
