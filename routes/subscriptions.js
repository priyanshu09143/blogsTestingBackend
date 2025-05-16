const express = require('express');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const router = express.Router();
const Notification = require('../models/Notification');

function isAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: 'Not authenticated' });
}

// Subscribe
router.post('/:targetUserId', isAuth, async (req, res) => {
  const { targetUserId } = req.params;

  if (req.user._id.equals(targetUserId)) {
    return res.status(400).json({ message: 'Cannot subscribe to yourself' });
  }

  const exists = await Subscription.findOne({ subscriberId: req.user._id, targetUserId });
  if (exists) {
    return res.status(400).json({ message: 'Already subscribed' });
  }

  const sub = await Subscription.create({ subscriberId: req.user._id, targetUserId });

  // ✅ Create a notification with message
  const Notification = require('../models/Notification');
  const message = `${req.user.displayName || req.user.username} has subscribed to you.`;

  const notification = await Notification.create({
    recipientId: targetUserId,
    message,
    type: 'subscription',
    seen: false,
  });

  // ✅ Emit real-time notification
  const io = req.app.get('io');
  const userSockets = io.userSockets;
  const socketId = userSockets[targetUserId];
  if (socketId) {
    io.to(socketId).emit('new_notification', notification); // Consider using 'new_notification'
  }

  res.json(sub);
});

// Unsubscribe
router.delete('/:targetUserId', isAuth, async (req, res) => {
  await Subscription.deleteOne({ subscriberId: req.user._id, targetUserId: req.params.targetUserId });
  res.json({ message: 'Unsubscribed' });
});

// List subscriptions
router.get('/', isAuth, async (req, res) => {
  const subs = await Subscription.find({ subscriberId: req.user._id }).populate('targetUserId', 'displayName');
  res.json(subs);
});

module.exports = router;