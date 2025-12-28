const pool = require('../config/database');
const bcrypt = require('bcrypt');

class UserModel {
  /**
   * Kullanıcı adına göre kullanıcıyı bul
   */
  static async findByUsername(username) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM kullanicilar WHERE kullanici_adi = ?',
        [username]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Kullanıcı ID'sine göre kullanıcıyı bul
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT id, kullanici_adi, email, olusturma_tarihi FROM kullanicilar WHERE id = ?',
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Şifre doğrulama
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Yeni kullanıcı oluştur
   */
  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.sifre, 10);
      const [result] = await pool.query(
        'INSERT INTO kullanicilar (kullanici_adi, email, sifre) VALUES (?, ?, ?)',
        [userData.kullanici_adi, userData.email, hashedPassword]
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserModel;

