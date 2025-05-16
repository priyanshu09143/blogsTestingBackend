const express = require('express');
const Notification = require('../models/Notification');
const router = express.Router();

function isAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: 'Not authenticated' });
}

// Get unseen notifications (missed + live)
router.get('/', isAuth, async (req, res) => {
  const notifications = await Notification.find({ recipientId: req.user._id, seen: false })
    .sort({ createdAt: -1 })
    .populate('postId');
  res.json(notifications);
});

// Mark all as seen
router.patch('/mark-seen', isAuth, async (req, res) => {
  await Notification.updateMany({ recipientId: req.user._id, seen: false }, { seen: true });
  res.json({ message: 'Marked as seen' });
});

module.exports = router;