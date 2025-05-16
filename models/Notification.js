const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
   recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  message: { type: String }, // e.g. "X has subscribed to you"
  type: { type: String, enum: ['post', 'subscription'], default: 'post' },
  seen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);