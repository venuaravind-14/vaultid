const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const { authenticateToken } = require('../middleware/auth');

// GET /api/documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const docs = await Document.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .select('-__v');
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/documents  — frontend sends pre-encrypted base64 payload
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { doc_name, doc_type, encrypted_data, file_size, mime_type } = req.body;
    if (!doc_name || !encrypted_data)
      return res.status(400).json({ error: 'doc_name and encrypted_data required' });

    const doc = await Document.create({
      user_id: req.user.id,
      doc_name,
      doc_type,
      encrypted_data,
      file_size: file_size || 0,
      mime_type: mime_type || ''
    });

    res.status(201).json({ document: { id: doc._id, doc_name: doc.doc_name, doc_type: doc.doc_type, file_size: doc.file_size, mime_type: doc.mime_type, created_at: doc.created_at } });
  } catch (err) {
    console.error('Add doc error:', err);
    res.status(500).json({ error: 'Failed to save document' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;