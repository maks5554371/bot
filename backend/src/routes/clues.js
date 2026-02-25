const express = require('express');
const { Team, Quest } = require('../models');
const telegram = require('../services/telegram');

const router = express.Router();

// POST /api/clues/send-first/:teamId — отправить первую подсказку команде
router.post('/send-first/:teamId', async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('members', 'telegram_id');
    if (!team) return res.status(404).json({ error: 'Команда не найдена' });
    if (!team.quest_id) return res.status(400).json({ error: 'У команды нет квеста' });

    const quest = await Quest.findById(team.quest_id);
    if (!quest || !quest.clues.length) return res.status(400).json({ error: 'В квесте нет подсказок' });

    // Сбросить прогресс
    team.current_clue_index = 0;
    await team.save();

    const clue = quest.clues[0];
    const clueText = `🚀 <b>Квест начался!</b>\n\n🔍 <b>Подсказка 1/${quest.clues.length}</b>\n\n${clue.text}`;

    for (const member of team.members) {
      try {
        await telegram.sendMessage(member.telegram_id, clueText);
        if (clue.location?.lat && clue.location?.lng) {
          await telegram.sendLocation(member.telegram_id, clue.location.lat, clue.location.lng);
        }
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
    if (!team.quest_id) return res.status(400).json({ error: 'У команды нет квеста' });

    const quest = await Quest.findById(team.quest_id);
    if (!quest) return res.status(404).json({ error: 'Квест не найден' });

    const nextIndex = team.current_clue_index + 1;
    if (nextIndex >= quest.clues.length) {
      return res.status(400).json({ error: 'Все подсказки уже отправлены' });
    }

    team.current_clue_index = nextIndex;
    await team.save();

    const clue = quest.clues[nextIndex];
    const clueText = `🔍 <b>Подсказка ${nextIndex + 1}/${quest.clues.length}</b>\n\n${clue.text}`;

    for (const member of team.members) {
      try {
        await telegram.sendMessage(member.telegram_id, clueText);
        if (clue.location?.lat && clue.location?.lng) {
          await telegram.sendLocation(member.telegram_id, clue.location.lat, clue.location.lng);
        }
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

module.exports = router;
