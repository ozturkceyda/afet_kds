const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'afet-kds-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS için
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 saat
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (public ve views klasörlerinden servis edilecek)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// API Routes
app.use('/api/provinces', require('./routes/api/provinceRoutes'));
app.use('/api/risks', require('./routes/api/riskRoutes'));
app.use('/api/earthquakes', require('./routes/api/earthquakeRoutes'));
app.use('/api/weather', require('./routes/api/weatherRoutes'));
app.use('/api/flood-risk', require('./routes/api/floodRiskRoutes'));
app.use('/api/fire-risk', require('./routes/api/fireRiskRoutes'));
app.use('/api/shelters', require('./routes/api/shelterRoutes'));
app.use('/api/fires', require('./routes/api/fireRoutes'));

// Dashboard route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint bulunamadı'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Hata:', err);
  res.status(500).json({
    success: false,
    message: 'Sunucu hatası',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;

