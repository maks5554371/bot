const express = require('express');
const axios = require('axios');
const { PhotoReport, Team, Quest } = require('../models');
const telegram = require('../services/telegram');
const config = require('../config');
const { sendStationToTeam } = require('../helpers/clueHelpers');

const router = express.Router();

async function getActiveQuest() {
  return Quest.findOne({ status: 'active' }).sort({ updatedAt: -1 });
}

// GET /api/photos — список фото-отчётов
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.team_id) filter.team_id = req.query.team_id;

    const photos = await PhotoReport.find(filter)
      .populate('team_id', 'name color')
      .populate('user_id', 'telegram_id telegram_username first_name')
      .sort({ submitted_at: -1 });
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/photos/:id/image — проксировать фото из Telegram
router.get('/:id/image', async (req, res) => {
  try {
    const photo = await PhotoReport.findById(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Фото не найдено' });

    const fileUrl = await telegram.getFileUrl(photo.telegram_file_id);
    const response = await axios.get(fileUrl, { responseType: 'stream' });
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    response.data.pipe(res);
  } catch (err) {
    console.error('Error proxying photo:', err.message);
    res.status(500).json({ error: 'Не удалось загрузить фото' });
  }
});

// PATCH /api/photos/:id — аппрув/реджект фото
router.patch('/:id', async (req, res) => {
  try {
    const { status, admin_comment } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Статус должен быть approved или rejected' });
    }

    const photo = await PhotoReport.findByIdAndUpdate(
      req.params.id,
      { status, admin_comment: admin_comment || '', reviewed_at: new Date() },
      { new: true }
    ).populate('team_id', 'name color current_clue_index')
     .populate('user_id', 'telegram_id telegram_username first_name');

    if (!photo) return res.status(404).json({ error: 'Фото не найдено' });

    const io = req.app.get('io');

    // Если аппрувнуто — продвинуть команду к следующей подсказке
    if (status === 'approved' && photo.team_id) {
      const team = await Team.findById(photo.team_id._id).populate('members', 'telegram_id');
      if (team) {
        const quest = await getActiveQuest();
        if (quest) {
          const nextIndex = team.current_clue_index + 1;
          if (nextIndex < quest.clues.length) {
            team.current_clue_index = nextIndex;
            await team.save();

            await sendStationToTeam(team, quest.clues[nextIndex], nextIndex, quest.clues.length);

            if (io) io.emit('clue_approved', { team_id: team._id, clue_index: nextIndex });
          } else {
            // Квест завершён для этой команды
            for (const member of team.members) {
              try {
                await telegram.sendMessage(member.telegram_id, '🎉 <b>Поздравляем! Вы прошли все точки квеста!</b>');
              } catch (e) {
                console.error(`Failed to send finish to ${member.telegram_id}:`, e.message);
              }
            }
            if (io) io.emit('team_finished', { team_id: team._id });
          }
        }
      }
    }

    if (io) io.emit('photo_reviewed', photo);
    res.json(photo);
  } catch (err) {
    console.error('Error reviewing photo:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
