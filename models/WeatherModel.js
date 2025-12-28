const pool = require('../config/database');

class WeatherModel {
  /**
   * İl ID'sine göre son hava durumu verilerini getir
   */
  static async getLatestByProvinceId(ilId, limit = 10) {
    try {
      let rows = [];
      try {
        [rows] = await pool.query(
          `SELECT 
            hd.*,
            i.il_adi,
            il.ilce_adi
          FROM hava_durumu_canli hd
          LEFT JOIN iller i ON hd.il_id = i.id
          LEFT JOIN ilceler il ON hd.ilce_id = il.id
          WHERE hd.il_id = ?
          ORDER BY hd.tarih_saat DESC
          LIMIT ?`,
          [ilId, limit]
        );
      } catch (err) {
        if (err.message.includes("doesn't exist") || err.message.includes("Unknown table")) {
          [rows] = await pool.query(
            `SELECT 
              hd.*,
              i.il_adi,
              il.ilce_adi
            FROM hava_durumu_verileri hd
            LEFT JOIN iller i ON hd.il_id = i.id
            LEFT JOIN ilceler il ON hd.ilce_id = il.id
            WHERE hd.il_id = ?
            ORDER BY hd.tarih_saat DESC
            LIMIT ?`,
            [ilId, limit]
          );
        } else {
          throw err;
        }
      }
      return rows;
    } catch (error) {
      throw new Error(`Hava durumu verileri getirilirken hata: ${error.message}`);
    }
  }

  /**
   * Tüm Marmara illeri için son hava durumu verilerini getir
   */
  static async getLatestForAllMarmara() {
    try {
      let rows = [];
      try {
        [rows] = await pool.query(
          `SELECT 
            hd.*,
            i.il_adi,
            il.ilce_adi
          FROM hava_durumu_canli hd
          LEFT JOIN iller i ON hd.il_id = i.id
          LEFT JOIN ilceler il ON hd.ilce_id = il.id
          WHERE i.bolge = 'Marmara'
          AND hd.tarih_saat >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          ORDER BY hd.tarih_saat DESC, i.il_adi ASC`
        );
      } catch (err) {
        if (err.message.includes("doesn't exist") || err.message.includes("Unknown table")) {
          [rows] = await pool.query(
            `SELECT 
              hd.*,
              i.il_adi,
              il.ilce_adi
            FROM hava_durumu_verileri hd
            LEFT JOIN iller i ON hd.il_id = i.id
            LEFT JOIN ilceler il ON hd.ilce_id = il.id
            WHERE i.bolge = 'Marmara'
            AND hd.tarih_saat >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY hd.tarih_saat DESC, i.il_adi ASC`
          );
        } else {
          throw err;
        }
      }
      return rows;
    } catch (error) {
      throw new Error(`Marmara hava durumu verileri getirilirken hata: ${error.message}`);
    }
  }

  /**
   * Tüm Marmara illeri için tahmin verilerini getir (son 7 gün)
   */
  static async getForecastForAllMarmara() {
    try {
      // Önce hava_durumu_canli tablosunu dene
      let rows = [];
      try {
        [rows] = await pool.query(
          `SELECT 
            hd.*,
            i.il_adi,
            il.ilce_adi
          FROM hava_durumu_canli hd
          LEFT JOIN iller i ON hd.il_id = i.id
          LEFT JOIN ilceler il ON hd.ilce_id = il.id
          WHERE i.bolge = 'Marmara'
          AND hd.tarih_saat >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          ORDER BY i.il_adi ASC, hd.tarih_saat ASC`
        );
      } catch (err) {
        // Eğer hava_durumu_canli yoksa hava_durumu_verileri tablosunu kullan
        if (err.message.includes("doesn't exist") || err.message.includes("Unknown table")) {
          [rows] = await pool.query(
            `SELECT 
              hd.*,
              i.il_adi,
              il.ilce_adi
            FROM hava_durumu_verileri hd
            LEFT JOIN iller i ON hd.il_id = i.id
            LEFT JOIN ilceler il ON hd.ilce_id = il.id
            WHERE i.bolge = 'Marmara'
            AND hd.tarih_saat >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY i.il_adi ASC, hd.tarih_saat ASC`
          );
        } else {
          throw err;
        }
      }
      return rows;
    } catch (error) {
      throw new Error(`Tahmin verileri getirilirken hata: ${error.message}`);
    }
  }

  /**
   * İl ID'sine göre hava durumu istatistiklerini getir
   */
  static async getStatisticsByProvinceId(ilId) {
    try {
      let rows = [];
      try {
        [rows] = await pool.query(
          `SELECT 
            AVG(hd.sicaklik) as ortalama_sicaklik,
            AVG(hd.nem) as ortalama_nem,
            AVG(hd.ruzgar_hizi) as ortalama_ruzgar,
            SUM(hd.yagis_miktari) as toplam_yagis,
            COUNT(*) as veri_sayisi
          FROM hava_durumu_canli hd
          WHERE hd.il_id = ?
          AND hd.tarih_saat >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
          [ilId]
        );
      } catch (err) {
        if (err.message.includes("doesn't exist") || err.message.includes("Unknown table")) {
          [rows] = await pool.query(
            `SELECT 
              AVG(hd.sicaklik) as ortalama_sicaklik,
              AVG(hd.nem) as ortalama_nem,
              AVG(hd.ruzgar_hizi) as ortalama_ruzgar,
              SUM(hd.yagis_miktari) as toplam_yagis,
              COUNT(*) as veri_sayisi
            FROM hava_durumu_verileri hd
            WHERE hd.il_id = ?
            AND hd.tarih_saat >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
            [ilId]
          );
        } else {
          throw err;
        }
      }
      return rows[0] || {};
    } catch (error) {
      throw new Error(`Hava durumu istatistikleri getirilirken hata: ${error.message}`);
    }
  }

  /**
   * Son 5 günün gerçek hava durumu verilerini getir (Marmara bölgesi için)
   */
  static async getLast5DaysForMarmara() {
    try {
      let rows = [];
      try {
        [rows] = await pool.query(
          `SELECT 
            hd.*,
            i.il_adi,
            il.ilce_adi
          FROM hava_durumu_canli hd
          LEFT JOIN iller i ON hd.il_id = i.id
          LEFT JOIN ilceler il ON hd.ilce_id = il.id
          WHERE i.bolge = 'Marmara'
          AND hd.tarih_saat >= DATE_SUB(NOW(), INTERVAL 5 DAY)
          ORDER BY i.il_adi ASC, hd.tarih_saat DESC`
        );
      } catch (err) {
        if (err.message.includes("doesn't exist") || err.message.includes("Unknown table")) {
          [rows] = await pool.query(
            `SELECT 
              hd.*,
              i.il_adi,
              il.ilce_adi
            FROM hava_durumu_verileri hd
            LEFT JOIN iller i ON hd.il_id = i.id
            LEFT JOIN ilceler il ON hd.ilce_id = il.id
            WHERE i.bolge = 'Marmara'
            AND hd.tarih_saat >= DATE_SUB(NOW(), INTERVAL 5 DAY)
            ORDER BY i.il_adi ASC, hd.tarih_saat DESC`
          );
        } else {
          throw err;
        }
      }
      return rows;
    } catch (error) {
      throw new Error(`Son 5 günün hava durumu verileri getirilirken hata: ${error.message}`);
    }
  }

  /**
   * Belirli tarih aralığı için hava durumu verilerini getir (Marmara bölgesi için)
   * @param {string} startDate - Başlangıç tarihi (YYYY-MM-DD formatında)
   * @param {string} endDate - Bitiş tarihi (YYYY-MM-DD formatında)
   */
  static async getWeatherByDateRange(startDate, endDate) {
    try {
      let rows = [];
      try {
        // Önce hava_durumu_canli tablosunu dene
        [rows] = await pool.query(
          `SELECT 
            hd.*,
            i.il_adi
          FROM hava_durumu_canli hd
          LEFT JOIN iller i ON hd.il_id = i.id
          WHERE i.bolge = 'Marmara'
          AND DATE(hd.tarih_saat) >= ?
          AND DATE(hd.tarih_saat) <= ?
          ORDER BY i.il_adi ASC, hd.tarih_saat ASC`,
          [startDate, endDate]
        );
      } catch (err) {
        // Eğer hava_durumu_canli yoksa hava_durumu_verileri tablosunu kullan
        if (err.message.includes("doesn't exist") || err.message.includes("Unknown table")) {
          [rows] = await pool.query(
            `SELECT 
              hd.*,
              i.il_adi
            FROM hava_durumu_verileri hd
            LEFT JOIN iller i ON hd.il_id = i.id
            WHERE i.bolge = 'Marmara'
            AND DATE(hd.tarih_saat) >= ?
            AND DATE(hd.tarih_saat) <= ?
            ORDER BY i.il_adi ASC, hd.tarih_saat ASC`,
            [startDate, endDate]
          );
        } else {
          throw err;
        }
      }
      return rows;
    } catch (error) {
      throw new Error(`Tarih aralığı hava durumu verileri getirilirken hata: ${error.message}`);
    }
  }
}

module.exports = WeatherModel;
