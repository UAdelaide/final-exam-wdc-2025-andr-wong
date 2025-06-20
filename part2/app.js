const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./models/db');
require('dotenv').config();

const app = express();

// Middleware
app.use(session({
  secret: 'dogwalking-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '/public')));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Authentication middleware to protect dashboard pages
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/');
  }
  next();
}

// Protected dashboard routes
app.get('/owner-dashboard.html', requireLogin, (req, res, next) => {
  next();
});

app.get('/walker-dashboard.html', requireLogin, (req, res, next) => {
  next();
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // For now, using simple password check (not hashed)
  // In production, you would check hashed passwords

  try {
    const [users] = await db.execute(
      'SELECT * FROM Users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Simple password check
    if (password !== user.password_hash) {
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

// Logout route
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Export the app instead of listening here
module.exports = app;
