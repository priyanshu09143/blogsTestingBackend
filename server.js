require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const sharedSession = require('express-socket.io-session');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }
});

app.set('io', io);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
});
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

io.use(sharedSession(sessionMiddleware, { autoSave: true }));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/blog', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'));

require('./config/passport')(passport);

// --- Socket.io user mapping ---
const userSockets = {};
io.userSockets = userSockets;

io.on('connection', (socket) => {
  const session = socket.handshake.session;
  if (!session || !session.passport || !session.passport.user) {
    socket.disconnect();
    return;
  }
  const userId = session.passport.user;
  userSockets[userId] = socket.id;
  console.log('Socket connected:', socket.id, 'for user:', userId);

  socket.on('disconnect', () => {
    delete userSockets[userId];
  });
});

// Routers
const postsRouter = require('./routes/posts');
postsRouter.setSocketIo(io);
app.use('/api/posts', postsRouter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/authors', require('./routes/auth'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));