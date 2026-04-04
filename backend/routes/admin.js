const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Card = require('../models/Card');
const Document = require('../models/Document');
const File = require('../models/File');
const ScanLog = require('../models/ScanLog');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/admin/users  — metadata only, zero content access
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .sort({ created_at: -1 })
      .select('-password -__v');

    // Attach per-user counts using Promise.all for efficiency
    const enriched = await Promise.all(users.map(async (u) => {
      const [cardCount, docCount, fileCount] = await Promise.all([
        Card.countDocuments({ user_id: u._id }),
        Document.countDocuments({ user_id: u._id }),
        File.countDocuments({ user_id: u._id })
      ]);
      return {
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
        last_login: u.last_login,
        stats: { cards: cardCount, documents: docCount, files: fileCount },
        // ZERO-ACCESS POLICY — content never exposed to admin
        content: '🔒 Private — encrypted with user key'
      };
    }));

    res.json({ users: enriched });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total_users, total_cards, total_documents, total_files, scans_today] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Card.countDocuments(),
      Document.countDocuments(),
      File.countDocuments(),
      ScanLog.countDocuments({ scanned_at: { $gte: today } })
    ]);

    res.json({ stats: { total_users, total_cards, total_documents, total_files, scans_today } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/admin/scan-log
router.post('/scan-log', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { card_id, scan_result, location } = req.body;
    const log = await ScanLog.create({
      scanner_id: req.user.id,
      scanned_card_id: card_id || null,
      scan_result: scan_result || '',
      location: location || 'Gate A'
    });
    res.status(201).json({ log_id: log._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log scan' });
  }
});

// GET /api/admin/scan-logs
router.get('/scan-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await ScanLog.find()
      .sort({ scanned_at: -1 })
      .limit(50)
      .populate('scanner_id', 'name email')
      .select('-__v');
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scan logs' });
  }
});

// GET /api/admin/search?q=
router.get('/search', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });

    const regex = new RegExp(q, 'i');
    const users = await User.find({
      role: 'user',
      $or: [{ name: regex }, { email: regex }]
    })
      .limit(20)
      .select('name email created_at -_id')
      .lean();

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;