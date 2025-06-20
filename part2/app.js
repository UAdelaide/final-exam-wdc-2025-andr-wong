const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();

// Middleware
app.use(session({
  secret: 'dogwalking-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // For now, using simple password check (not hashed)
  // In production, you would check hashed passwords
  const db = require('./models/db');

  try {
    const [users] = await db.execute(
      'SELECT * FROM Users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Simple password check (in production, use proper hashing)
    if (password !== 'password123') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Store user in session
    req.session.user = {
      id: user.user_id,
      username: user.username,
      role: user.role
    };

    // Redirect based on role
    if (user.role === 'owner') {
      res.json({ redirect: '/owner-dashboard.html' });
    } else if (user.role === 'walker') {
      res.json({ redirect: '/walker-dashboard.html' });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;