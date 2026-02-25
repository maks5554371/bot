const express = require('express');
const { Quest } = require('../models');

const router = express.Router();

// GET /api/quests
router.get('/', async (req, res) => {
  try {
    const quests = await Quest.find().sort({ createdAt: -1 });
    res.json(quests);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/quests/:id
router.get('/:id', async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    if (!quest) return res.status(404).json({ error: 'Квест не найден' });
    res.json(quest);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/quests
router.post('/', async (req, res) => {
  try {
    const { title, description, clues, starts_at } = req.body;
    if (!title) return res.status(400).json({ error: 'Название квеста обязательно' });

    const quest = await Quest.create({ title, description, clues: clues || [], starts_at });
    res.status(201).json(quest);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PATCH /api/quests/:id
router.patch('/:id', async (req, res) => {
  try {
    const { title, description, status, clues, starts_at } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (status !== undefined) update.status = status;
    if (clues !== undefined) update.clues = clues;
    if (starts_at !== undefined) update.starts_at = starts_at;

    const quest = await Quest.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!quest) return res.status(404).json({ error: 'Квест не найден' });
    res.json(quest);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/quests/:id
router.delete('/:id', async (req, res) => {
  try {
    const quest = await Quest.findByIdAndDelete(req.params.id);
    if (!quest) return res.status(404).json({ error: 'Квест не найден' });
    res.json({ message: 'Квест удалён' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
