const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Card = require('../models/Card');
const { authenticateToken } = require('../middleware/auth');

// Multer config — card image uploads saved to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'card-' + unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype))
      cb(null, true);
    else cb(new Error('Only JPEG/PNG/WebP images allowed'));
  }
});

// GET /api/cards
router.get('/', authenticateToken, async (req, res) => {
  try {
    const cards = await Card.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .select('-__v');
    res.json({ cards });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// POST /api/cards  (multipart/form-data with optional card_image)
router.post('/', authenticateToken, upload.single('card_image'), async (req, res) => {
  try {
    const { card_type, card_name, card_number_preview, org_name, expiry_date, encrypted_data, qr_data } = req.body;
    if (!card_type || !encrypted_data)
      return res.status(400).json({ error: 'card_type and encrypted_data are required' });

    const card_image_path = req.file ? `/uploads/${req.file.filename}` : null;

    const card = await Card.create({
      user_id: req.user.id,
      card_type,
      card_name,
      card_number_preview,
      org_name,
      expiry_date,
      encrypted_data,
      qr_data,
      card_image_path
    });

    res.status(201).json({ card });
  } catch (err) {
    console.error('Add card error:', err);
    res.status(500).json({ error: 'Failed to save card' });
  }
});

// DELETE /api/cards/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const card = await Card.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    // Remove uploaded image file if present
    if (card.card_image_path) {
      const fullPath = path.join(__dirname, '..', card.card_image_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await card.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// GET /api/cards/:id/image  — serve the uploaded card photo
router.get('/:id/image', authenticateToken, async (req, res) => {
  try {
    const card = await Card.findOne({ _id: req.params.id, user_id: req.user.id }).select('card_image_path');
    if (!card || !card.card_image_path) return res.status(404).json({ error: 'No image' });
    const fullPath = path.join(__dirname, '..', card.card_image_path);
    if (fs.existsSync(fullPath)) res.sendFile(fullPath);
    else res.status(404).json({ error: 'File not found on disk' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

module.exports = router;