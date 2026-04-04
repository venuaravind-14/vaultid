const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  user_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  file_name:      { type: String, required: true, trim: true },
  file_type:      { type: String, default: '' },
  encrypted_data: { type: String, required: true },
  file_size:      { type: Number, default: 0 },
  mime_type:      { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('File', fileSchema);
