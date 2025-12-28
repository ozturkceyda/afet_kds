const db = require('../config/database');

class DistrictModel {
  // İl ID'sine göre ilçeleri getir
  static async getByProvinceId(ilId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM ilceler WHERE il_id = ? ORDER BY ilce_adi ASC',
        [ilId]
      );
      return rows;
    } catch (error) {
      throw new Error(`İlçeler getirilirken hata: ${error.message}`);
    }
  }

  // ID'ye göre ilçe getir
  static async getById(id) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM ilceler WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw new Error(`İlçe getirilirken hata: ${error.message}`);
    }
  }
}

module.exports = DistrictModel;




















