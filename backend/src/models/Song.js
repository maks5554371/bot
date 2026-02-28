const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  telegram_id: { type: Number, required: true, index: true },
  spotify_id: { type: String, required: true },
  spotify_uri: { type: String, required: true },
  name: { type: String, required: true },
  artist: { type: String, default: '' },
  album: { type: String, default: '' },
  cover_url: { type: String, default: '' },
  preview_url: { type: String, default: '' },
  external_url: { type: String, default: '' },
  added_to_playlist: { type: Boolean, default: false },
}, { timestamps: true });

// Compound index: each user can add a specific track only once
songSchema.index({ user_id: 1, spotify_id: 1 }, { unique: true });

module.exports = mongoose.model('Song', songSchema);
