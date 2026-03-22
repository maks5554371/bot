const express = require('express');
const axios = require('axios');
const archiver = require('archiver');
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

// GET /api/photos/download/zip — скачать все фото архивом
router.get('/download/zip', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.team_id) filter.team_id = req.query.team_id;

    const photos = await PhotoReport.find(filter)
      .populate('team_id', 'name')
      .populate('user_id', 'first_name telegram_username')
      .sort({ submitted_at: 1 });

    if (photos.length === 0) {
      return res.status(404).json({ error: 'Нет фото для скачивания' });
    }

    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename="photos-${Date.now()}.zip"`);

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const fileUrl = await telegram.getFileUrl(photo.telegram_file_id);
        const response = await axios.get(fileUrl, { responseType: 'stream' });

        const teamName = (photo.team_id?.name || 'no-team').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
        const userName = (photo.user_id?.first_name || photo.user_id?.telegram_username || 'anon').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
        const ext = (response.headers['content-type'] || '').includes('png') ? 'png' : 'jpg';
        const filename = `${teamName}/${userName}_station${photo.clue_index + 1}_${i + 1}.${ext}`;

        archive.append(response.data, { name: filename });
      } catch (e) {
        console.error(`Failed to download photo ${photo._id}:`, e.message);
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error('Error creating photos zip:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка при создании архива' });
    }
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

    // Обновляем только если фото ещё на рассмотрении (pending) — защита от повторных кликов
    const photo = await PhotoReport.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status, admin_comment: admin_comment || '', reviewed_at: new Date() },
      { new: true }
    ).populate('team_id', 'name color current_clue_index')
     .populate('user_id', 'telegram_id telegram_username first_name');

    if (!photo) {
      // Фото не найдено или уже обработано
      const existing = await PhotoReport.findById(req.params.id);
      if (existing) return res.json(existing);
      return res.status(404).json({ error: 'Фото не найдено' });
    }

    const io = req.app.get('io');

    // Если отклонено — уведомить команду
    if (status === 'rejected' && photo.team_id) {
      const team = await Team.findById(photo.team_id._id).populate('members', 'telegram_id');
      if (team) {
        const comment = admin_comment ? `\n💬 <i>${admin_comment}</i>` : '';
        for (const member of team.members) {
          try {
            await telegram.sendMessage(member.telegram_id, `❌ <b>Фото отклонено.</b> Попробуйте ещё раз!${comment}`);
          } catch (e) {
            console.error(`Failed to send rejection to ${member.telegram_id}:`, e.message);
          }
        }
      }
    }

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
