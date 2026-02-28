const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegram_id: { type: Number, required: true, unique: true, index: true },
  telegram_username: { type: String, default: '' },
  first_name: { type: String, default: '' },
  phone: { type: String, default: '' },
  team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  registered_at: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: true },
  last_location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    updated_at: { type: Date, default: null },
  },
  // --- Profile ---
  lives: { type: Number, default: 3 },
  experience: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  title: { type: String, default: 'Новичок' },
  coins: { type: Number, default: 0 },
  inventory: [{
    name: { type: String },
    description: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    granted_at: { type: Date, default: Date.now },
  }],
  stats: {
    photos_sent: { type: Number, default: 0 },
    messages_sent: { type: Number, default: 0 },
    songs_added: { type: Number, default: 0 },
    quests_completed: { type: Number, default: 0 },
    votes_cast: { type: Number, default: 0 },
    best_votes_received: { type: Number, default: 0 },
    worst_votes_received: { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
