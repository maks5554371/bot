const mongoose = require('mongoose');

const clueSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  text: { type: String, required: true },
  media_url: { type: String, default: '' },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  radius_meters: { type: Number, default: 100 },
  photo_required: { type: Boolean, default: true },
});

const questSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
  clues: [clueSchema],
  starts_at: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Quest', questSchema);
