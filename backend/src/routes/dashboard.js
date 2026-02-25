const express = require('express');
const { User, Team, PhotoReport, Quest } = require('../models');

const router = express.Router();

// GET /api/dashboard — агрегированные данные
router.get('/', async (req, res) => {
  try {
    const [
      totalUsers,
      totalTeams,
      pendingPhotos,
      approvedPhotos,
      activeQuests,
      users,
      teams,
    ] = await Promise.all([
      User.countDocuments(),
      Team.countDocuments(),
      PhotoReport.countDocuments({ status: 'pending' }),
      PhotoReport.countDocuments({ status: 'approved' }),
      Quest.countDocuments({ status: 'active' }),
      User.find({ is_active: true }).select('first_name telegram_username team_id last_location').populate('team_id', 'name color'),
      Team.find().populate('members', 'first_name telegram_username last_location').populate('quest_id', 'title clues'),
    ]);

    // Прогресс команд
    const teamProgress = teams.map(t => {
      const totalClues = t.quest_id?.clues?.length || 0;
      return {
        _id: t._id,
        name: t.name,
        color: t.color,
        members_count: t.members.length,
        current_clue_index: t.current_clue_index,
        total_clues: totalClues,
        progress_percent: totalClues > 0 ? Math.round((t.current_clue_index / totalClues) * 100) : 0,
      };
    });

    // Пользователи с активной геолокацией (обновлялась < 10 мин назад)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const activeLocations = users.filter(
      u => u.last_location?.updated_at && u.last_location.updated_at > tenMinAgo
    );

    res.json({
      totalUsers,
      totalTeams,
      pendingPhotos,
      approvedPhotos,
      activeQuests,
      teamProgress,
      activeLocations,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
