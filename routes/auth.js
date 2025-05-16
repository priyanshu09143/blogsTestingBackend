const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// Local Register
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) return res.status(400).json({ message: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username,displayName:username, password: hash, email });
    req.login(user, err => {
      if (err) return res.status(500).json({ message: 'Login error' });
      res.json({ user });
    });
  } catch (err) {
    res.status(400).json({ message: 'User already exists' });
  }
});

// Local Login
router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ user: req.user });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout(() => {
    res.json({ message: 'Logged out' });
  });
});

// Google OAuth Start
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth Callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login' }),
  (req, res) => {
    // Redirect to frontend with session
    res.redirect('http://localhost:5173/');
  }
);

// Get current user
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ user: null });
  res.json({ user: req.user });
});

// List all authors (for sidebar)
router.get('/authors', async (req, res) => {
  try {
    const users = await User.find({}, 'displayName username profilePic');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get author info by ID
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id, 'displayName username profilePic');
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
});

module.exports = router;