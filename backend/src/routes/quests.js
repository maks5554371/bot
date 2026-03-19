const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Quest } = require('../models');
const { geocodeAddress } = require('../services/geocoding');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads/quests');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Допустимы только image/video файлы'));
  },
});

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateCoordinates(lat, lng) {
  if (lat === null && lng === null) return;
  if (lat === null || lng === null) {
    throw new Error('Для координат нужны и lat, и lng');
  }
  if (lat < -90 || lat > 90) {
    throw new Error('lat должен быть в диапазоне от -90 до 90');
  }
  if (lng < -180 || lng > 180) {
    throw new Error('lng должен быть в диапазоне от -180 до 180');
  }
}

async function normalizeClue(clue, order) {
  const nextClue = {
    order,
    text: clue.text,
    task_text: clue.task_text || '',
    answers: clue.answers || [],
    radius_meters: Number(clue.radius_meters || 100),
    photo_required: clue.photo_required !== false,
  };

  // Множественные медиа-файлы
  if (clue.media_files && clue.media_files.length > 0) {
    nextClue.media_files = clue.media_files.map((m) => ({
      type: m.type || 'image',
      url: m.url || '',
      mime: m.mime || '',
      size: Number(m.size || 0),
      original_name: m.original_name || '',
    }));
  }

  if (clue.media_url) {
    nextClue.media_url = clue.media_url;
  }

  if (clue.media?.url || clue.media_url) {
    const mediaUrl = clue.media?.url || clue.media_url;
    nextClue.media = {
      type: clue.media?.type || (mediaUrl.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'image'),
      url: mediaUrl,
      mime: clue.media?.mime || '',
      size: Number(clue.media?.size || 0),
      original_name: clue.media?.original_name || '',
    };
    nextClue.media_url = mediaUrl;
  }

  const rawLat = parseNumber(clue.location?.lat);
  const rawLng = parseNumber(clue.location?.lng);
  const rawAddress = (clue.location?.address_text || '').trim();

  if (rawAddress && (rawLat === null || rawLng === null)) {
    const geocoded = await geocodeAddress(rawAddress);
    if (!geocoded) {
      throw new Error(`Не удалось определить координаты по адресу: ${rawAddress}`);
    }
    validateCoordinates(geocoded.lat, geocoded.lng);
    nextClue.location = {
      lat: geocoded.lat,
      lng: geocoded.lng,
      address_text: rawAddress,
    };
    return nextClue;
  }

  validateCoordinates(rawLat, rawLng);
  nextClue.location = {
    lat: rawLat,
    lng: rawLng,
    address_text: rawAddress,
  };

  return nextClue;
}

async function normalizeClues(clues = []) {
  const result = [];
  for (let i = 0; i < clues.length; i += 1) {
    result.push(await normalizeClue(clues[i], i + 1));
  }
  return result;
}

async function ensureSingleActiveQuest(questId) {
  await Quest.updateMany(
    { _id: { $ne: questId }, status: 'active' },
    { $set: { status: 'draft' } }
  );
}

// GET /api/quests
router.get('/', async (_req, res) => {
  try {
    const quests = await Quest.find().sort({ createdAt: -1 });
    res.json(quests);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/quests/active/current
router.get('/active/current', async (_req, res) => {
  try {
    const quest = await Quest.findOne({ status: 'active' }).sort({ updatedAt: -1 });
    if (!quest) return res.status(404).json({ error: 'Активный квест не найден' });
    res.json(quest);
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

// POST /api/quests/media
router.post('/media', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл обязателен' });

    const url = `/api/uploads/quests/${req.file.filename}`;
    const media = {
      type: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
      url,
      mime: req.file.mimetype,
      size: req.file.size,
      original_name: req.file.originalname,
    };

    res.status(201).json({ url, media });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ошибка загрузки файла' });
  }
});

// POST /api/quests
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      clues,
      starts_at,
      status,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Название квеста обязательно' });

    const normalizedClues = await normalizeClues(clues || []);
    const quest = await Quest.create({
      title,
      description,
      clues: normalizedClues,
      starts_at,
      status: status || 'draft',
    });

    if (quest.status === 'active') {
      await ensureSingleActiveQuest(quest._id);
    }

    res.status(201).json(quest);
  } catch (err) {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
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
    if (starts_at !== undefined) update.starts_at = starts_at;
    if (clues !== undefined) update.clues = await normalizeClues(clues);

    const quest = await Quest.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!quest) return res.status(404).json({ error: 'Квест не найден' });

    if (quest.status === 'active') {
      await ensureSingleActiveQuest(quest._id);
    }

    res.json(quest);
  } catch (err) {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
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
