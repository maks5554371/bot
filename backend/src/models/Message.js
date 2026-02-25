const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  target_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  target_telegram_id: { type: Number, required: true },
  text: { type: String, required: true },
  from_admin: { type: Boolean, default: true },
  delivered: { type: Boolean, default: false },
  sent_at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
