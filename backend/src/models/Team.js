const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#3B82F6' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  current_clue_index: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
