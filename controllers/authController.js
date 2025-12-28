const UserModel = require('../models/UserModel');

class AuthController {
  /**
   * Kullanıcı girişi
   */
  static async login(req, res) {
    try {
      const { kullanici_adi, sifre } = req.body;

      if (!kullanici_adi || !sifre) {
        return res.status(400).json({
          success: false,
          message: 'Kullanıcı adı ve şifre gereklidir'
        });
      }

      // Kullanıcıyı bul
      const user = await UserModel.findByUsername(kullanici_adi);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı adı veya şifre hatalı'
        });
      }

      // Şifre kontrolü
      const isValidPassword = await UserModel.verifyPassword(sifre, user.sifre);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı adı veya şifre hatalı'
        });
      }

      // Aktif kullanıcı kontrolü
      if (!user.aktif) {
        return res.status(403).json({
          success: false,
          message: 'Hesabınız devre dışı bırakılmış'
        });
      }

      // Session oluştur
      req.session.userId = user.id;
      req.session.username = user.kullanici_adi;

      return res.json({
        success: true,
        message: 'Giriş başarılı',
        user: {
          id: user.id,
          kullanici_adi: user.kullanici_adi,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Login hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Giriş sırasında bir hata oluştu'
      });
    }
  }

  /**
   * Kullanıcı çıkışı
   */
  static async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Çıkış yapılırken bir hata oluştu'
          });
        }
        res.clearCookie('connect.sid');
        return res.json({
          success: true,
          message: 'Çıkış başarılı'
        });
      });
    } catch (error) {
      console.error('Logout hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Çıkış sırasında bir hata oluştu'
      });
    }
  }

  /**
   * Mevcut kullanıcı bilgilerini getir
   */
  static async getCurrentUser(req, res) {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'Oturum bulunamadı'
        });
      }

      const user = await UserModel.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          kullanici_adi: user.kullanici_adi,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Get current user hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Kullanıcı bilgileri alınırken bir hata oluştu'
      });
    }
  }
}

module.exports = AuthController;

