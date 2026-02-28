const mongoose = require('mongoose');

const votingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: { type: String, enum: ['active', 'finished'], default: 'active' },
  categories: {
    type: [String],
    default: ['best', 'worst'],
  },
  started_at: { type: Date, default: Date.now },
  finished_at: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Voting', votingSchema);
