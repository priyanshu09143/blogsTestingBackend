const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, sparse: true },
  password: String, // hashed
  googleId: { type: String, unique: true, sparse: true },
  displayName: String,
  email: String,
  profilePic: String,
});

module.exports = mongoose.model('User', UserSchema);