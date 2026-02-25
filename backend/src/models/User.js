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
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
