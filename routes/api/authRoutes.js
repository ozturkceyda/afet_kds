const express = require('express');
const router = express.Router();
const AuthController = require('../../controllers/authController');
const { requireAuth } = require('../../middleware/authMiddleware');

// POST /api/auth/login - Kullanıcı girişi
router.post('/login', AuthController.login);

// POST /api/auth/logout - Kullanıcı çıkışı
router.post('/logout', requireAuth, AuthController.logout);

// GET /api/auth/me - Mevcut kullanıcı bilgileri
router.get('/me', requireAuth, AuthController.getCurrentUser);

module.exports = router;

