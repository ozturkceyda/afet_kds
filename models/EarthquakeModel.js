const pool = require('../config/database');

class EarthquakeModel {
  /**
   * İl bazında geçmiş deprem verilerini getir
   */
  static async getByProvinceId(ilId, limit = 50) {
    try {
      const [rows] = await pool.query(
        `SELECT 
          dg.id,
          dg.buyukluk,
          dg.derinlik,
          dg.tarih_saat,
          dg.enlem,
          dg.boylam,
          dg.hasar_bilgisi,
          i.il_adi,
          ilc.ilce_adi
        FROM deprem_gecmis dg
        INNER JOIN iller i ON dg.il_id = i.id
        LEFT JOIN ilceler ilc ON dg.ilce_id = ilc.id
        WHERE dg.il_id = ?
        ORDER BY dg.tarih_saat DESC
        LIMIT ?`,
        [ilId, limit]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * İl bazında deprem istatistiklerini getir
   */
  static async getProvinceStatistics(ilId) {
    try {
      const [rows] = await pool.query(
        `SELECT 
          COUNT(*) as toplam_deprem,
          AVG(buyukluk) as ortalama_buyukluk,
          MAX(buyukluk) as en_buyuk_deprem,
          MIN(buyukluk) as en_kucuk_deprem,
          AVG(derinlik) as ortalama_derinlik,
          MIN(tarih_saat) as ilk_deprem,
          MAX(tarih_saat) as son_deprem
        FROM deprem_gecmis
        WHERE il_id = ?`,
        [ilId]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * En büyük depremleri getir
   */
  static async getLargestEarthquakes(limit = 10) {
    try {
      const [rows] = await pool.query(
        `SELECT 
          dg.id,
          dg.buyukluk,
          dg.derinlik,
          dg.tarih_saat,
          dg.enlem,
          dg.boylam,
          i.il_adi,
          ilc.ilce_adi
        FROM deprem_gecmis dg
        INNER JOIN iller i ON dg.il_id = i.id
        LEFT JOIN ilceler ilc ON dg.ilce_id = ilc.id
        ORDER BY dg.buyukluk DESC
        LIMIT ?`,
        [limit]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Son depremleri getir
   */
  static async getRecentEarthquakes(limit = 10) {
    try {
      const [rows] = await pool.query(
        `SELECT 
          dg.id,
          dg.buyukluk,
          dg.derinlik,
          dg.tarih_saat,
          dg.enlem,
          dg.boylam,
          i.il_adi,
          ilc.ilce_adi
        FROM deprem_gecmis dg
        INNER JOIN iller i ON dg.il_id = i.id
        LEFT JOIN ilceler ilc ON dg.ilce_id = ilc.id
        ORDER BY dg.tarih_saat DESC
        LIMIT ?`,
        [limit]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Canlı deprem verilerini getir (tüm canlı depremler - tarih filtresi yok)
   * NOT: Tarih parse sorunları nedeniyle filtre kaldırıldı
   */
  static async getLiveEarthquakes(limit = 50) {
    try {
      const [rows] = await pool.query(
        `SELECT 
          dc.id,
          dc.buyukluk,
          dc.derinlik,
          dc.tarih_saat,
          dc.enlem,
          dc.boylam,
          dc.kaynak,
          i.il_adi,
          ilc.ilce_adi
        FROM deprem_canli dc
        INNER JOIN iller i ON dc.il_id = i.id
        LEFT JOIN ilceler ilc ON dc.ilce_id = ilc.id
        ORDER BY dc.tarih_saat DESC
        LIMIT ?`,
        [limit]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * İl bazında canlı deprem verilerini getir
   */
  static async getLiveEarthquakesByProvince(ilId, limit = 50) {
    try {
      const [rows] = await pool.query(
        `SELECT 
          dc.id,
          dc.buyukluk,
          dc.derinlik,
          dc.tarih_saat,
          dc.enlem,
          dc.boylam,
          dc.kaynak,
          i.il_adi,
          ilc.ilce_adi
        FROM deprem_canli dc
        INNER JOIN iller i ON dc.il_id = i.id
        LEFT JOIN ilceler ilc ON dc.ilce_id = ilc.id
        WHERE dc.il_id = ?
        ORDER BY dc.tarih_saat DESC
        LIMIT ?`,
        [ilId, limit]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Canlı deprem istatistikleri (tüm canlı depremler)
   * NOT: 24 saatlik filtre kaldırıldı - tüm canlı depremleri göster
   */
  static async getLiveEarthquakeStatistics() {
    try {
      const [rows] = await pool.query(
        `SELECT 
          COUNT(*) as toplam_deprem,
          AVG(buyukluk) as ortalama_buyukluk,
          MAX(buyukluk) as en_buyuk_deprem,
          MIN(buyukluk) as en_kucuk_deprem,
          AVG(derinlik) as ortalama_derinlik,
          MAX(tarih_saat) as son_deprem
        FROM deprem_canli`,
        []
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Son 30 günlük il bazında deprem sayılarını getir
   */
  static async getLast30DaysByProvince() {
    try {
      const [rows] = await pool.query(
        `SELECT 
          i.id as il_id,
          i.il_adi,
          COUNT(dg.id) as deprem_sayisi,
          AVG(dg.buyukluk) as ortalama_buyukluk,
          MAX(dg.buyukluk) as max_buyukluk
        FROM iller i
        LEFT JOIN deprem_gecmis dg ON i.id = dg.il_id
          AND dg.tarih_saat >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        WHERE i.bolge = 'Marmara'
        GROUP BY i.id, i.il_adi
        HAVING deprem_sayisi > 0
        ORDER BY deprem_sayisi DESC`,
        []
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = EarthquakeModel;

