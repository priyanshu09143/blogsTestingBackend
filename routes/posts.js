const express = require('express');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');
const router = express.Router();

let io;
function setSocketIo(_io) { io = _io; }
module.exports.setSocketIo = setSocketIo;

// Middleware to check authentication
function isAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: 'Not authenticated' });
}

// Get all posts (optionally filter by author)
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.author) filter.author = req.query.author;
  const posts = await Post.find(filter).populate('author', 'displayName username');
  res.json(posts);
});

// Get single post
router.get('/:id', async (req, res) => {
  const post = await Post.findById(req.params.id).populate('author', 'displayName username');
  if (!post) return res.status(404).json({ message: 'Not found' });
  res.json(post);
});

// Create post (with notification logic)
router.post('/', isAuth, async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;
    const post = await Post.create({
      title,
      content,
      tags,
      author: req.user._id,
    });

    // Find all subscribers to this author
    const subs = await Subscription.find({ targetUserId: req.user._id });
    for (const sub of subs) {
      // Create notification in DB
      const notif = await Notification.create({
        recipientId: sub.subscriberId,
        postId: post._id,
        seen: false,
      });
      // Emit real-time notification if online
      if (io && io.userSockets) {
        const socketId = io.userSockets[sub.subscriberId.toString()];
        if (socketId) {
          io.to(socketId).emit('new_post', {
            postId: post._id,
            title: post.title,
            author: req.user.displayName || req.user.username,
            createdAt: notif.createdAt,
          });
        }
      }
    }
    res.json(post);
  } catch (err) {
    next(err);
  }
});

// Edit post
router.put('/:id', isAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Not found' });
  if (!post.author.equals(req.user._id)) return res.status(403).json({ message: 'Forbidden' });
  post.title = req.body.title;
  post.content = req.body.content;
  post.tags = req.body.tags;
  await post.save();
  res.json(post);
});

// Delete post
router.delete('/:id', isAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Not found' });
  if (!post.author.equals(req.user._id)) return res.status(403).json({ message: 'Forbidden' });
  await post.deleteOne();
  res.json({ message: 'Deleted' });
});
module.exports = router;
module.exports.setSocketIo = setSocketIo;