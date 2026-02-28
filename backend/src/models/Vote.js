const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  voting_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Voting', required: true, index: true },
  voter_telegram_id: { type: Number, required: true },
  voter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: ['best', 'worst'], required: true },
}, { timestamps: true });

// Один голос за категорию в одном голосовании
voteSchema.index({ voting_id: 1, voter_id: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
