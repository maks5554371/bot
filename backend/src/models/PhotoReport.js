const mongoose = require('mongoose');

const photoReportSchema = new mongoose.Schema({
  team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clue_index: { type: Number, required: true },
  telegram_file_id: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  admin_comment: { type: String, default: '' },
  submitted_at: { type: Date, default: Date.now },
  reviewed_at: { type: Date, default: null },
}, { timestamps: true });

photoReportSchema.index({ team_id: 1, status: 1 });

module.exports = mongoose.model('PhotoReport', photoReportSchema);
