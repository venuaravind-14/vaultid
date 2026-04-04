const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  user_id:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  card_type:           { type: String, required: true, enum: ['student','bus','library','employee','uploaded','custom'] },
  encrypted_data:      { type: String, required: true },
  card_name:           { type: String, default: '' },
  card_number_preview: { type: String, default: '' },
  org_name:            { type: String, default: '' },
  expiry_date:         { type: String, default: '' },
  card_image_path:     { type: String, default: null },
  qr_data:             { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Card', cardSchema);
