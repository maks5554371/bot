const express = require('express');
const { Team, Quest } = require('../models');
const telegram = require('../services/telegram');
const config = require('../config');

const router = express.Router();

async function getActiveQuest() {
  return Quest.findOne({ status: 'active' }).sort({ updatedAt: -1 });
}

/**
 * Получить полный URL медиа-файла из относительного пути.
 */
function getFullMediaUrl(relativeUrl) {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith('http')) return relativeUrl;
  // BACKEND_URL может быть внутренним (docker), используем публичный URL если есть
  const baseUrl = process.env.PUBLIC_URL || process.env.BACKEND_URL || `http://localhost:${config.port}`;
  return `${baseUrl}${relativeUrl}`;
}

/**
 * Получить URL и тип медиа из подсказки.
 */
function getClueMedia(clue) {
  // Приоритет: новое поле media, затем legacy media_url
  if (clue.media?.url) {
    return { url: getFullMediaUrl(clue.media.url), type: clue.media.type || 'image' };
  }
  if (clue.media_url) {
    // Определяем тип по расширению
    const ext = clue.media_url.split('.').pop().toLowerCase();
    const videoExts = ['mp4', 'mov', 'avi', 'webm'];
    const type = videoExts.includes(ext) ? 'video' : 'image';
    return { url: getFullMediaUrl(clue.media_url), type };
  }
  return null;
}

/**
 * Отправить подсказку одному участнику (текст + медиа).
 */
async function sendClueToMember(chatId, clueText, media) {
  if (media && media.url) {
    if (media.type === 'video') {
      // Для видео: отправляем текст + видео отдельно
      await telegram.sendMessage(chatId, clueText);
      try {
        await telegram.sendVideo(chatId, media.url);
      } catch (e) {
        console.error(`Failed to send video to ${chatId}:`, e.message);
      }
    } else {
      // Для фото: отправляем фото с подписью
      try {
        await telegram.sendPhoto(chatId, media.url, clueText);
      } catch (e) {
        // Если фото не удалось — отправляем текст + ссылку
        console.error(`Failed to send photo to ${chatId}, falling back to text:`, e.message);
        await telegram.sendMessage(chatId, clueText);
      }
    }
  } else {
    await telegram.sendMessage(chatId, clueText);
  }
}

// POST /api/clues/send-first/:teamId — отправить первую подсказку команде
router.post('/send-first/:teamId', async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('members', 'telegram_id');
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });

    const quest = await getActiveQuest();
    if (!quest || !quest.clues.length) return res.status(400).json({ error: 'В квесте нет подсказок' });

    // Сбросить прогресс
    team.current_clue_index = 0;
    await team.save();

    const clue = quest.clues[0];
    const clueText = `🚀 <b>Квест начался!</b>\n\n🔍 <b>Подсказка 1/${quest.clues.length}</b>\n\n${clue.text}`;
    const media = getClueMedia(clue);

    for (const member of team.members) {
      try {
        await sendClueToMember(member.telegram_id, clueText, media);
      } catch (e) {
        console.error(`Failed to send first clue to ${member.telegram_id}:`, e.message);
      }
    }

    const io = req.app.get('io');
    if (io) io.emit('clue_sent', { team_id: team._id, clue_index: 0 });

    res.json({ message: 'Первая подсказка отправлена', clue_index: 0 });
  } catch (err) {
    console.error('Send first clue error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/clues/send-next/:teamId — отправить следующую подсказку вручную
router.post('/send-next/:teamId', async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('members', 'telegram_id');
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });

    const quest = await getActiveQuest();
    if (!quest) return res.status(404).json({ error: 'Квест не найден' });

    const nextIndex = team.current_clue_index + 1;
    if (nextIndex >= quest.clues.length) {
      return res.status(400).json({ error: 'Все подсказки уже отправлены' });
    }

    team.current_clue_index = nextIndex;
    await team.save();

    const clue = quest.clues[nextIndex];
    const clueText = `🔍 <b>Подсказка ${nextIndex + 1}/${quest.clues.length}</b>\n\n${clue.text}`;
    const media = getClueMedia(clue);

    for (const member of team.members) {
      try {
        await sendClueToMember(member.telegram_id, clueText, media);
      } catch (e) {
        console.error(`Failed to send clue to ${member.telegram_id}:`, e.message);
      }
    }

    const io = req.app.get('io');
    if (io) io.emit('clue_approved', { team_id: team._id, clue_index: nextIndex });

    res.json({ message: `Подсказка ${nextIndex + 1} отправлена`, clue_index: nextIndex });
  } catch (err) {
    console.error('Send next clue error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/clues/send-location/:teamId — отправить координаты текущей подсказки как подсказку-помощь
router.post('/send-location/:teamId', async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('members', 'telegram_id');
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });

    const quest = await getActiveQuest();
    if (!quest) return res.status(404).json({ error: 'Квест не найден' });

    const clueIndex = team.current_clue_index;
    if (clueIndex >= quest.clues.length) {
      return res.status(400).json({ error: 'Нет текущей подсказки' });
    }

    const clue = quest.clues[clueIndex];
    if (!clue.location?.lat || !clue.location?.lng) {
      return res.status(400).json({ error: 'У этой подсказки нет координат' });
    }

    for (const member of team.members) {
      try {
        await telegram.sendMessage(
          member.telegram_id,
          '📍 <b>Подсказка-помощь:</b> вот точка на карте, если совсем не получается найти!'
        );
        await telegram.sendLocation(member.telegram_id, clue.location.lat, clue.location.lng);
      } catch (e) {
        console.error(`Failed to send location hint to ${member.telegram_id}:`, e.message);
      }
    }

    const io = req.app.get('io');
    if (io) io.emit('location_hint_sent', { team_id: team._id, clue_index: clueIndex });

    res.json({ message: `Координаты подсказки ${clueIndex + 1} отправлены`, clue_index: clueIndex });
  } catch (err) {
    console.error('Send location hint error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
