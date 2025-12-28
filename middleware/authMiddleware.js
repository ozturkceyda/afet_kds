/**
 * Authentication Middleware
 * Korumalı route'lar için kullanıcı giriş kontrolü yapar
 */

const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    // Kullanıcı giriş yapmış, devam et
    return next();
  } else {
    // Kullanıcı giriş yapmamış, login sayfasına yönlendir
    return res.redirect('/login');
  }
};

module.exports = {
  requireAuth
};

