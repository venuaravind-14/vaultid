const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  scanner_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  scanned_card_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: null },
  scan_result:     { type: String, default: '' },
  location:        { type: String, default: 'Gate A' }
}, { timestamps: { createdAt: 'scanned_at', updatedAt: false } });

module.exports = mongoose.model('ScanLog', scanLogSchema);