const mongoose = require('mongoose');

const clueSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  text: { type: String, required: true },
  media_url: { type: String, default: '' },
  media: {
    type: {
      type: String,
      enum: ['image', 'video'],
      default: null,
    },
    url: { type: String, default: '' },
    mime: { type: String, default: '' },
    size: { type: Number, default: 0 },
    original_name: { type: String, default: '' },
  },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    address_text: { type: String, default: '' },
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
