const db = require('../config/database');

class RiskScoreModel {
  // İl bazında risk skorlarını getir
  static async getByProvinceId(ilId) {
    try {
      const [rows] = await db.query(
        `SELECT 
          rs.*,
          i.il_adi,
          ilce.ilce_adi
        FROM risk_skorlari rs
        INNER JOIN iller i ON rs.il_id = i.id
        LEFT JOIN ilceler ilce ON rs.ilce_id = ilce.id
        WHERE rs.il_id = ?
        ORDER BY rs.genel_risk_skoru DESC`,
        [ilId]
      );
      return rows;
    } catch (error) {
      throw new Error(`Risk skorları getirilirken hata: ${error.message}`);
    }
  }

  // İl bazında ortalama risk skorlarını getir (ilçe bazlı değil, il geneli)
  static async getProvinceAverage(ilId) {
    try {
      // Validate ilId
      if (!ilId || isNaN(parseInt(ilId))) {
        throw new Error('Geçersiz il_id parametresi');
      }

      const [rows] = await db.query(
        `SELECT 
          rs.il_id,
          i.il_adi,
          AVG(COALESCE(rs.deprem_riski, 0)) as ortalama_deprem_riski,
          AVG(COALESCE(rs.sel_riski, 0)) as ortalama_sel_riski,
          AVG(COALESCE(rs.yangin_riski, 0)) as ortalama_yangin_riski,
          AVG(COALESCE(rs.genel_risk_skoru, 0)) as ortalama_genel_risk_skoru,
          COUNT(*) as ilce_sayisi
        FROM risk_skorlari rs
        INNER JOIN iller i ON rs.il_id = i.id
        WHERE rs.il_id = ?
        GROUP BY rs.il_id, i.il_adi`,
        [parseInt(ilId)]
      );
      
      if (!rows || rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error(`❌ [RiskScoreModel.getProvinceAverage] Database error:`, error);
      throw new Error(`İl ortalama risk skorları getirilirken hata: ${error.message}`);
    }
  }

  // Tüm illerin risk skorlarını getir
  static async getAllProvinceAverages() {
    try {
      const [rows] = await db.query(
        `SELECT 
          rs.il_id,
          i.il_adi,
          i.bolge,
          AVG(rs.deprem_riski) as ortalama_deprem_riski,
          AVG(rs.sel_riski) as ortalama_sel_riski,
          AVG(rs.yangin_riski) as ortalama_yangin_riski,
          AVG(rs.genel_risk_skoru) as ortalama_genel_risk_skoru,
          COUNT(*) as ilce_sayisi
        FROM risk_skorlari rs
        INNER JOIN iller i ON rs.il_id = i.id
        GROUP BY rs.il_id, i.il_adi, i.bolge
        ORDER BY ortalama_genel_risk_skoru DESC`
      );
      return rows;
    } catch (error) {
      throw new Error(`Tüm il risk skorları getirilirken hata: ${error.message}`);
    }
  }

  /**
   * İl bazında sel riski skorunu güncelle
   * @param {number} ilId - İl ID
   * @param {number} yeniSelRiski - Yeni sel riski skoru (0-100)
   * @returns {Promise<boolean>}
   */
  static async updateSelRiski(ilId, yeniSelRiski) {
    try {
      // İl bazında risk skorları var mı kontrol et (ilce_id = NULL olanlar)
      const [existing] = await db.query(
        `SELECT id, sel_riski FROM risk_skorlari 
         WHERE il_id = ? AND ilce_id IS NULL`,
        [ilId]
      );

      if (existing.length > 0) {
        // Mevcut skoru güncelle
        await db.query(
          `UPDATE risk_skorlari 
           SET sel_riski = ?,
               genel_risk_skoru = (
                 (COALESCE(deprem_riski, 0) + ? + COALESCE(yangin_riski, 0)) / 3
               )
           WHERE il_id = ? AND ilce_id IS NULL`,
          [yeniSelRiski, yeniSelRiski, ilId]
        );
        return true;
      } else {
        // Yeni kayıt oluştur
        await db.query(
          `INSERT INTO risk_skorlari (il_id, ilce_id, sel_riski, genel_risk_skoru)
           VALUES (?, NULL, ?, ?)`,
          [ilId, yeniSelRiski, yeniSelRiski / 3]
        );
        return true;
      }
    } catch (error) {
      throw new Error(`Sel riski güncellenirken hata: ${error.message}`);
    }
  }

  /**
   * Tüm ilçeler için sel riski skorunu güncelle
   * @param {number} ilId - İl ID
   * @param {number} yeniSelRiski - Yeni sel riski skoru (0-100)
   * @returns {Promise<boolean>}
   */
  static async updateSelRiskiForAllDistricts(ilId, yeniSelRiski) {
    try {
      await db.query(
        `UPDATE risk_skorlari 
         SET sel_riski = ?,
             genel_risk_skoru = (
               (COALESCE(deprem_riski, 0) + ? + COALESCE(yangin_riski, 0)) / 3
             )
         WHERE il_id = ?`,
        [yeniSelRiski, yeniSelRiski, ilId]
      );
      return true;
    } catch (error) {
      throw new Error(`Tüm ilçeler için sel riski güncellenirken hata: ${error.message}`);
    }
  }
}

module.exports = RiskScoreModel;

