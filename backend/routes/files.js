const express = require('express');
const router = express.Router();
const File = require('../models/File');
const { authenticateToken } = require('../middleware/auth');

// GET /api/files
router.get('/', authenticateToken, async (req, res) => {
  try {
    const files = await File.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .select('-__v');
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// POST /api/files  — frontend sends pre-encrypted base64 payload
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { file_name, file_type, encrypted_data, file_size, mime_type } = req.body;
    if (!file_name || !encrypted_data)
      return res.status(400).json({ error: 'file_name and encrypted_data required' });

    const file = await File.create({
      user_id: req.user.id,
      file_name,
      file_type,
      encrypted_data,
      file_size: file_size || 0,
      mime_type: mime_type || ''
    });

    res.status(201).json({ file: { id: file._id, file_name: file.file_name, file_type: file.file_type, file_size: file.file_size, mime_type: file.mime_type, created_at: file.created_at } });
  } catch (err) {
    console.error('Add file error:', err);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// DELETE /api/files/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const file = await File.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;