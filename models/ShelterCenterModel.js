const db = require('../config/database');

class ShelterCenterModel {
  // Tüm barınma merkezlerinin toplam kapasitelerini getir (il bazında)
  static async getTotalCapacities() {
    try {
      const [rows] = await db.query(
        `SELECT 
          merkez_tipi,
          SUM(kapasite) as toplam_kapasite,
          SUM(dolu_kapasite) as toplam_dolu
        FROM barinma_merkezleri 
        WHERE ilce_id IS NULL AND durum = 'aktif'
        GROUP BY merkez_tipi`
      );
      return rows;
    } catch (error) {
      throw new Error(`Barınma merkezleri getirilirken hata: ${error.message}`);
    }
  }

  // İl bazında barınma merkezlerini getir
  static async getByProvinceId(ilId) {
    try {
      const [rows] = await db.query(
        `SELECT 
          merkez_tipi,
          SUM(kapasite) as toplam_kapasite,
          SUM(dolu_kapasite) as toplam_dolu
        FROM barinma_merkezleri 
        WHERE il_id = ? AND ilce_id IS NULL AND durum = 'aktif'
        GROUP BY merkez_tipi`,
        [ilId]
      );
      return rows;
    } catch (error) {
      throw new Error(`İl barınma merkezleri getirilirken hata: ${error.message}`);
    }
  }
}

module.exports = ShelterCenterModel;

