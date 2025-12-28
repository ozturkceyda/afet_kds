const pool = require('../config/database');

class FloodModel {
  /**
   * Tüm Marmara illeri için sel verilerini getir
   * @returns {Promise<Array>} Sel verileri listesi
   */
  static async getAllFloodData() {
    try {
      const [rows] = await pool.query(
        `SELECT sv.*, i.il_adi, i.enlem, i.boylam
         FROM sel_verileri sv
         JOIN iller i ON sv.il_id = i.id
         WHERE i.bolge = 'Marmara'
         ORDER BY i.il_adi ASC, sv.yil ASC`
      );
      return rows;
    } catch (error) {
      throw new Error(`Sel verileri getirilirken hata: ${error.message}`);
    }
  }

  /**
   * İl bazında sel verilerini getir
   * @param {number} ilId - İl ID
   * @returns {Promise<Array>} İl bazında sel verileri
   */
  static async getFloodDataByProvince(ilId) {
    try {
      const [rows] = await pool.query(
        `SELECT sv.*, i.il_adi
         FROM sel_verileri sv
         JOIN iller i ON sv.il_id = i.id
         WHERE sv.il_id = ?
         ORDER BY sv.yil ASC`,
        [ilId]
      );
      return rows;
    } catch (error) {
      throw new Error(`İl bazında sel verileri getirilirken hata: ${error.message}`);
    }
  }

  /**
   * 4 yıllık ortalama sel sayılarını hesapla (2022-2025)
   * @returns {Promise<Array>} İl bazında ortalama sel sayıları
   */
  static async calculate4YearAverage() {
    try {
      const [rows] = await pool.query(
        `SELECT 
          i.id as il_id,
          i.il_adi,
          i.enlem,
          i.boylam,
          AVG(sv.sel_sayisi) as ortalama_sel_sayisi,
          SUM(sv.sel_sayisi) as toplam_sel_sayisi,
          COUNT(sv.yil) as yil_sayisi
         FROM iller i
         LEFT JOIN sel_verileri sv ON i.id = sv.il_id AND sv.yil BETWEEN 2022 AND 2025
         WHERE i.bolge = 'Marmara'
         GROUP BY i.id, i.il_adi, i.enlem, i.boylam
         HAVING yil_sayisi > 0
         ORDER BY ortalama_sel_sayisi DESC`
      );
      return rows.map(row => ({
        il_id: row.il_id,
        il_adi: row.il_adi,
        enlem: parseFloat(row.enlem) || null,
        boylam: parseFloat(row.boylam) || null,
        ortalama_sel_sayisi: parseFloat(row.ortalama_sel_sayisi || 0),
        toplam_sel_sayisi: parseInt(row.toplam_sel_sayisi || 0),
        yil_sayisi: parseInt(row.yil_sayisi || 0)
      }));
    } catch (error) {
      throw new Error(`4 yıllık ortalama hesaplanırken hata: ${error.message}`);
    }
  }

  /**
   * Min-Max normalizasyonu uygula (0-1 aralığına)
   * @param {Array} averages - Ortalama sel sayıları dizisi
   * @returns {Array} Normalize edilmiş veriler
   */
  static normalizeData(averages) {
    if (averages.length === 0) return [];

    const values = averages.map(item => item.ortalama_sel_sayisi);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) {
      // Tüm değerler aynıysa, normalize değeri 0.5 olarak ayarla
      return averages.map(item => ({
        ...item,
        normalized_score: 0.5
      }));
    }

    return averages.map(item => ({
      ...item,
      normalized_score: (item.ortalama_sel_sayisi - min) / range
    }));
  }

  /**
   * Risk seviyesini belirle
   * @param {number} normalizedScore - Normalize edilmiş skor (0-1)
   * @returns {Object} Risk seviyesi bilgisi
   */
  static classifyRiskLevel(normalizedScore) {
    let level, label, color, priority;

    if (normalizedScore >= 0.81) {
      level = 'very_high';
      label = 'Çok Yüksek';
      color = '#ef4444'; // red-500
      priority = true;
    } else if (normalizedScore >= 0.61) {
      level = 'high';
      label = 'Yüksek';
      color = '#f97316'; // orange-500
      priority = true;
    } else if (normalizedScore >= 0.41) {
      level = 'medium';
      label = 'Orta';
      color = '#eab308'; // yellow-500
      priority = false;
    } else if (normalizedScore >= 0.21) {
      level = 'low';
      label = 'Düşük';
      color = '#22c55e'; // green-500
      priority = false;
    } else {
      level = 'very_low';
      label = 'Çok Düşük';
      color = '#3b82f6'; // blue-500
      priority = false;
    }

    return { level, label, color, priority };
  }

  /**
   * Hava durumuna göre sel risk skorunu hesapla
   * @param {number} ilId - İl ID
   * @returns {Promise<Object>} Hava durumu bazlı sel risk skoru
   */
  static async calculateWeatherBasedFloodRisk(ilId) {
    try {
      // Son 7 günün hava durumu verilerini al
      const [weatherData] = await pool.query(`
        SELECT 
          AVG(yagis_miktari) as ortalama_yagis,
          SUM(yagis_miktari) as toplam_yagis,
          MAX(yagis_miktari) as max_yagis,
          AVG(nem) as ortalama_nem,
          COUNT(*) as veri_sayisi
        FROM hava_durumu_canli
        WHERE il_id = ? 
        AND tarih_saat >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND yagis_miktari IS NOT NULL
      `, [ilId]);

      if (!weatherData || weatherData.length === 0 || !weatherData[0].veri_sayisi) {
        return {
          weather_risk_score: 0,
          weather_risk_level: 'veri_yok',
          weather_risk_label: 'Veri Yok',
          weather_risk_color: '#64748b',
          ortalama_yagis: 0,
          toplam_yagis: 0,
          max_yagis: 0,
          ortalama_nem: 0
        };
      }

      const data = weatherData[0];
      const ortalamaYagis = parseFloat(data.ortalama_yagis || 0);
      const toplamYagis = parseFloat(data.toplam_yagis || 0);
      const maxYagis = parseFloat(data.max_yagis || 0);
      const ortalamaNem = parseFloat(data.ortalama_nem || 0);

      // Yağış bazlı risk skoru hesaplama (0-1 arası)
      // Kritik eşikler: 10mm/gün orta risk, 20mm/gün yüksek risk, 50mm/gün çok yüksek risk
      let weatherRiskScore = 0;
      
      // Ortalama yağış faktörü (%40 ağırlık)
      if (ortalamaYagis >= 50) {
        weatherRiskScore += 0.4; // Çok yüksek
      } else if (ortalamaYagis >= 20) {
        weatherRiskScore += 0.3; // Yüksek
      } else if (ortalamaYagis >= 10) {
        weatherRiskScore += 0.2; // Orta
      } else if (ortalamaYagis >= 5) {
        weatherRiskScore += 0.1; // Düşük
      }

      // Toplam yağış faktörü (%30 ağırlık)
      if (toplamYagis >= 100) {
        weatherRiskScore += 0.3; // Çok yüksek
      } else if (toplamYagis >= 50) {
        weatherRiskScore += 0.2; // Yüksek
      } else if (toplamYagis >= 20) {
        weatherRiskScore += 0.1; // Orta
      }

      // Maksimum yağış faktörü (%20 ağırlık)
      if (maxYagis >= 50) {
        weatherRiskScore += 0.2; // Çok yüksek
      } else if (maxYagis >= 20) {
        weatherRiskScore += 0.15; // Yüksek
      } else if (maxYagis >= 10) {
        weatherRiskScore += 0.1; // Orta
      }

      // Nem faktörü (%10 ağırlık) - Yüksek nem sel riskini artırır
      if (ortalamaNem >= 80) {
        weatherRiskScore += 0.1;
      } else if (ortalamaNem >= 70) {
        weatherRiskScore += 0.05;
      }

      // Skoru 0-1 aralığına normalize et
      weatherRiskScore = Math.min(weatherRiskScore, 1);

      // Risk seviyesi sınıflandırması
      let weatherRiskLevel = 'çok_düşük';
      let weatherRiskLabel = 'Çok Düşük';
      let weatherRiskColor = '#3b82f6'; // Mavi

      if (weatherRiskScore >= 0.7) {
        weatherRiskLevel = 'çok_yüksek';
        weatherRiskLabel = 'Çok Yüksek';
        weatherRiskColor = '#ef4444'; // Kırmızı
      } else if (weatherRiskScore >= 0.5) {
        weatherRiskLevel = 'yüksek';
        weatherRiskLabel = 'Yüksek';
        weatherRiskColor = '#f97316'; // Turuncu
      } else if (weatherRiskScore >= 0.3) {
        weatherRiskLevel = 'orta';
        weatherRiskLabel = 'Orta';
        weatherRiskColor = '#eab308'; // Sarı
      } else if (weatherRiskScore >= 0.1) {
        weatherRiskLevel = 'düşük';
        weatherRiskLabel = 'Düşük';
        weatherRiskColor = '#22c55e'; // Yeşil
      }

      return {
        weather_risk_score: parseFloat(weatherRiskScore.toFixed(4)),
        weather_risk_level: weatherRiskLevel,
        weather_risk_label: weatherRiskLabel,
        weather_risk_color: weatherRiskColor,
        ortalama_yagis: parseFloat(ortalamaYagis.toFixed(2)),
        toplam_yagis: parseFloat(toplamYagis.toFixed(2)),
        max_yagis: parseFloat(maxYagis.toFixed(2)),
        ortalama_nem: parseFloat(ortalamaNem.toFixed(1))
      };
    } catch (error) {
      // Hava durumu verisi yoksa veya hata varsa, varsayılan değer döndür
      return {
        weather_risk_score: 0,
        weather_risk_level: 'veri_yok',
        weather_risk_label: 'Veri Yok',
        weather_risk_color: '#64748b',
        ortalama_yagis: 0,
        toplam_yagis: 0,
        max_yagis: 0,
        ortalama_nem: 0
      };
    }
  }

  /**
   * Tüm analizi yap: Ortalama, Normalize, Risk Sınıflandırması + Hava Durumu
   * @returns {Promise<Array>} Tam analiz sonuçları
   */
  static async performCompleteAnalysis() {
    try {
      // 1. 4 yıllık ortalamayı hesapla
      const averages = await this.calculate4YearAverage();

      // 2. Normalizasyon uygula
      const normalized = this.normalizeData(averages);

      // 3. Her il için hava durumu bazlı sel riskini hesapla ve birleştir
      const results = await Promise.all(normalized.map(async item => {
        // Hava durumu bazlı risk skorunu al
        const weatherRisk = await this.calculateWeatherBasedFloodRisk(item.il_id);

        // Tarihsel sel riski ile hava durumu riskini birleştir
        // Tarihsel risk %60, hava durumu riski %40 ağırlıkta
        const combinedScore = (item.normalized_score * 0.6) + (weatherRisk.weather_risk_score * 0.4);

        // Birleştirilmiş skora göre risk seviyesini belirle
        const riskInfo = this.classifyRiskLevel(combinedScore);

        return {
          ...item,
          risk_level: riskInfo.level,
          risk_label: riskInfo.label,
          risk_color: riskInfo.color,
          is_priority: riskInfo.priority,
          // Hava durumu bilgileri
          weather_risk_score: weatherRisk.weather_risk_score,
          weather_risk_level: weatherRisk.weather_risk_level,
          weather_risk_label: weatherRisk.weather_risk_label,
          weather_risk_color: weatherRisk.weather_risk_color,
          ortalama_yagis: weatherRisk.ortalama_yagis,
          toplam_yagis: weatherRisk.toplam_yagis,
          max_yagis: weatherRisk.max_yagis,
          ortalama_nem: weatherRisk.ortalama_nem,
          combined_risk_score: parseFloat(combinedScore.toFixed(4))
        };
      }));

      return results;
    } catch (error) {
      throw new Error(`Analiz yapılırken hata: ${error.message}`);
    }
  }

  /**
   * İl bazında yıllık trend verilerini getir
   * @param {number} ilId - İl ID
   * @returns {Promise<Array>} Yıllık trend verileri
   */
  static async getYearlyTrend(ilId) {
    try {
      const [rows] = await pool.query(
        `SELECT yil, sel_sayisi
         FROM sel_verileri
         WHERE il_id = ? AND yil BETWEEN 2022 AND 2025
         ORDER BY yil ASC`,
        [ilId]
      );
      return rows.map(row => ({
        yil: parseInt(row.yil),
        sel_sayisi: parseInt(row.sel_sayisi || 0)
      }));
    } catch (error) {
      throw new Error(`Yıllık trend verileri getirilirken hata: ${error.message}`);
    }
  }

  /**
   * İl için sel önerilerini kaydet veya güncelle (sel_verileri tablosuna)
   * @param {number} ilId - İl ID
   * @param {Object} oneriler - Öneri verileri
   * @returns {Promise<boolean>}
   */
  static async saveOrUpdateRecommendations(ilId, oneriler) {
    try {
      // İl bazında en son yılın kaydını bul (2025) veya oluştur
      const [existing] = await pool.query(
        'SELECT id FROM sel_verileri WHERE il_id = ? AND yil = 2025',
        [ilId]
      );

      if (existing.length > 0) {
        // Güncelle
        await pool.query(
          `UPDATE sel_verileri SET
            onerilen_butce = ?,
            dere_islahi_oncelik = ?,
            yagmur_suyu_kanali_oncelik = ?,
            baraj_regulator_oncelik = ?,
            sel_onleme_duvari_oncelik = ?,
            acil_mudahale_ekipmani_oncelik = ?
           WHERE il_id = ? AND yil = 2025`,
          [
            oneriler.onerilen_butce,
            oneriler.dere_islahi_oncelik,
            oneriler.yagmur_suyu_kanali_oncelik,
            oneriler.baraj_regulator_oncelik,
            oneriler.sel_onleme_duvari_oncelik,
            oneriler.acil_mudahale_ekipmani_oncelik,
            ilId
          ]
        );
      } else {
        // Yeni kayıt ekle (2025 yılı için)
        await pool.query(
          `INSERT INTO sel_verileri (
            il_id, yil, sel_sayisi,
            onerilen_butce,
            dere_islahi_oncelik, yagmur_suyu_kanali_oncelik,
            baraj_regulator_oncelik, sel_onleme_duvari_oncelik,
            acil_mudahale_ekipmani_oncelik
          ) VALUES (?, 2025, 0, ?, ?, ?, ?, ?, ?)`,
          [
            ilId,
            oneriler.onerilen_butce,
            oneriler.dere_islahi_oncelik,
            oneriler.yagmur_suyu_kanali_oncelik,
            oneriler.baraj_regulator_oncelik,
            oneriler.sel_onleme_duvari_oncelik,
            oneriler.acil_mudahale_ekipmani_oncelik
          ]
        );
      }
      return true;
    } catch (error) {
      throw new Error(`Sel önerileri kaydedilirken hata: ${error.message}`);
    }
  }

  /**
   * Tüm iller için sel önerilerini getir (sel_verileri tablosundan)
   * @returns {Promise<Array>} Tüm öneriler
   */
  static async getAllRecommendations() {
    try {
      const [rows] = await pool.query(
        `SELECT sv.il_id, sv.yil, sv.sel_sayisi,
                sv.onerilen_butce,
                sv.dere_islahi_oncelik,
                sv.yagmur_suyu_kanali_oncelik,
                sv.baraj_regulator_oncelik,
                sv.sel_onleme_duvari_oncelik,
                sv.acil_mudahale_ekipmani_oncelik,
                i.il_adi
         FROM sel_verileri sv
         JOIN iller i ON sv.il_id = i.id
         WHERE i.bolge = 'Marmara' AND sv.yil = 2025
         ORDER BY sv.onerilen_butce DESC`
      );
      return rows;
    } catch (error) {
      throw new Error(`Sel önerileri getirilirken hata: ${error.message}`);
    }
  }

  /**
   * İl bazında sel önerilerini getir (sel_verileri tablosundan)
   * @param {number} ilId - İl ID
   * @returns {Promise<Object|null>} Öneri verileri
   */
  static async getRecommendationsByProvince(ilId) {
    try {
      const [rows] = await pool.query(
        `SELECT sv.il_id, sv.yil, sv.sel_sayisi,
                sv.onerilen_butce,
                sv.dere_islahi_oncelik,
                sv.yagmur_suyu_kanali_oncelik,
                sv.baraj_regulator_oncelik,
                sv.sel_onleme_duvari_oncelik,
                sv.acil_mudahale_ekipmani_oncelik,
                i.il_adi
         FROM sel_verileri sv
         JOIN iller i ON sv.il_id = i.id
         WHERE sv.il_id = ? AND sv.yil = 2025`,
        [ilId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`İl bazında sel önerileri getirilirken hata: ${error.message}`);
    }
  }

  /**
   * Analiz sonuçlarına göre tüm önerileri hesapla ve kaydet
   * @param {Array} analysisData - Analiz sonuçları
   * @returns {Promise<Object>} İşlem sonucu
   */
  static async calculateAndSaveAllRecommendations(analysisData) {
    try {
      let saved = 0;
      let updated = 0;
      const errors = [];

      for (const item of analysisData) {
        try {
          // Bütçe hesaplama
          let budget = 5; // Base bütçe
          budget += item.normalized_score * 80; // Risk skoruna göre
          budget += item.ortalama_sel_sayisi * 3; // Sel sayısına göre
          if (item.is_priority) {
            budget *= 1.3; // Öncelikli bölgeler için %30 ekstra
          }

          // Altyapı öncelikleri hesaplama
          const riskScore = item.normalized_score;
          let improvements = {
            dere_islahi_oncelik: 0,
            yagmur_suyu_kanali_oncelik: 0,
            baraj_regulator_oncelik: 0,
            sel_onleme_duvari_oncelik: 0,
            acil_mudahale_ekipmani_oncelik: 0
          };

          if (riskScore >= 0.8) {
            improvements.dere_islahi_oncelik = 5;
            improvements.yagmur_suyu_kanali_oncelik = 5;
            improvements.baraj_regulator_oncelik = 4;
            improvements.sel_onleme_duvari_oncelik = 5;
            improvements.acil_mudahale_ekipmani_oncelik = 5;
          } else if (riskScore >= 0.6) {
            improvements.dere_islahi_oncelik = 4;
            improvements.yagmur_suyu_kanali_oncelik = 4;
            improvements.baraj_regulator_oncelik = 3;
            improvements.sel_onleme_duvari_oncelik = 4;
            improvements.acil_mudahale_ekipmani_oncelik = 4;
          } else if (riskScore >= 0.4) {
            improvements.dere_islahi_oncelik = 3;
            improvements.yagmur_suyu_kanali_oncelik = 3;
            improvements.baraj_regulator_oncelik = 2;
            improvements.sel_onleme_duvari_oncelik = 2;
            improvements.acil_mudahale_ekipmani_oncelik = 3;
          } else if (riskScore >= 0.2) {
            improvements.dere_islahi_oncelik = 2;
            improvements.yagmur_suyu_kanali_oncelik = 2;
            improvements.baraj_regulator_oncelik = 1;
            improvements.sel_onleme_duvari_oncelik = 1;
            improvements.acil_mudahale_ekipmani_oncelik = 2;
          } else {
            improvements.dere_islahi_oncelik = 1;
            improvements.yagmur_suyu_kanali_oncelik = 1;
            improvements.acil_mudahale_ekipmani_oncelik = 1;
          }

          // Ortalama sel sayısına göre ek öncelik
          if (item.ortalama_sel_sayisi >= 7) {
            improvements.acil_mudahale_ekipmani_oncelik = Math.min(5, improvements.acil_mudahale_ekipmani_oncelik + 2);
            improvements.sel_onleme_duvari_oncelik = Math.min(5, improvements.sel_onleme_duvari_oncelik + 1);
          } else if (item.ortalama_sel_sayisi >= 5) {
            improvements.acil_mudahale_ekipmani_oncelik = Math.min(5, improvements.acil_mudahale_ekipmani_oncelik + 1);
          }

          const oneriler = {
            onerilen_butce: Math.round(budget),
            ...improvements
          };

          // Mevcut kaydı kontrol et (sel_verileri tablosunda 2025 yılı için)
          const [existing] = await pool.query(
            'SELECT id FROM sel_verileri WHERE il_id = ? AND yil = 2025',
            [item.il_id]
          );

          if (existing.length > 0) {
            await this.saveOrUpdateRecommendations(item.il_id, oneriler);
            updated++;
          } else {
            await this.saveOrUpdateRecommendations(item.il_id, oneriler);
            saved++;
          }
        } catch (error) {
          errors.push({ il_id: item.il_id, il_adi: item.il_adi, error: error.message });
        }
      }

      return {
        success: true,
        saved,
        updated,
        errors,
        total: analysisData.length
      };
    } catch (error) {
      throw new Error(`Öneriler hesaplanırken ve kaydedilirken hata: ${error.message}`);
    }
  }
}

module.exports = FloodModel;

