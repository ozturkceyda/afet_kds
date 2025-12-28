const pool = require('../config/database');
const RiskScoreModel = require('../models/RiskScoreModel');
const WeatherModel = require('../models/WeatherModel');
const FloodModel = require('../models/FloodModel');
const { calculateAndUpdateFloodRisk, getForecastRainfallNext7Days } = require('../scripts/calculateFloodRisk');
const { calculateFloodRiskIncrease } = require('../scripts/calculateFloodRisk');

class FloodRiskController {
  /**
   * İl bazında sel riski analizini çalıştır ve güncelle
   * POST /api/flood-risk/calculate?il_id=1
   */
  static async calculateFloodRisk(req, res) {
    try {
      const { il_id } = req.query;
      
      if (!il_id) {
        return res.status(400).json({
          success: false,
          message: 'il_id parametresi gerekli'
        });
      }

      // İl bilgisini al
      const [provinces] = await pool.query(
        'SELECT id, il_adi FROM iller WHERE id = ?',
        [il_id]
      );

      if (provinces.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'İl bulunamadı'
        });
      }

      const province = provinces[0];
      const result = await calculateAndUpdateFloodRisk(province.id, province.il_adi);

      if (result.hata) {
        return res.status(500).json({
          success: false,
          message: result.hata,
          data: result
        });
      }

      return res.json({
        success: true,
        message: 'Sel riski analizi tamamlandı',
        data: result
      });
    } catch (error) {
      console.error('Sel riski hesaplanırken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Sel riski hesaplanırken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Tüm iller için sel riski analizini çalıştır
   * POST /api/flood-risk/calculate-all
   */
  static async calculateAllFloodRisks(req, res) {
    try {
      const [provinces] = await pool.query(
        'SELECT id, il_adi FROM iller WHERE bolge = "Marmara" ORDER BY il_adi'
      );

      const results = [];
      let updated = 0;
      let errors = 0;

      for (const province of provinces) {
        const result = await calculateAndUpdateFloodRisk(province.id, province.il_adi);
        results.push(result);

        if (result.hata) {
          errors++;
        } else {
          updated++;
        }
      }

      return res.json({
        success: true,
        message: 'Tüm iller için sel riski analizi tamamlandı',
        data: {
          results,
          summary: {
            total: provinces.length,
            updated,
            errors
          }
        }
      });
    } catch (error) {
      console.error('Tüm iller için sel riski hesaplanırken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Sel riski hesaplanırken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * İl bazında sel riski durumunu getir (yağış verileri ile birlikte)
   * GET /api/flood-risk/status?il_id=1
   */
  static async getFloodRiskStatus(req, res) {
    try {
      const { il_id } = req.query;
      
      if (!il_id) {
        return res.status(400).json({
          success: false,
          message: 'il_id parametresi gerekli'
        });
      }

      // Mevcut sel riski skorunu al
      const [riskRows] = await pool.query(
        `SELECT AVG(sel_riski) as ortalama_sel_riski
         FROM risk_skorlari
         WHERE il_id = ?
         GROUP BY il_id`,
        [il_id]
      );

      const mevcutSelRiski = riskRows.length > 0 ? parseFloat(riskRows[0]?.ortalama_sel_riski || 0) : null;

      // Son 24 saatteki toplam yağış
      const { getTotalRainfallLast24Hours } = require('../scripts/calculateFloodRisk');
      const yagis24Saat = await getTotalRainfallLast24Hours(il_id);

      // Gelecek 7 günlük tahmin edilen yağış
      const yagisGelecek7Gun = await getForecastRainfallNext7Days(il_id);

      // İl bilgisini al
      const [provinces] = await pool.query(
        'SELECT id, il_adi FROM iller WHERE id = ?',
        [il_id]
      );

      // Risk seviyesini belirle
      let riskSeviyesi = 'normal';
      let riskRenk = 'green';
      
      if (mevcutSelRiski >= 70) {
        riskSeviyesi = 'kritik';
        riskRenk = 'red';
      } else if (mevcutSelRiski >= 50) {
        riskSeviyesi = 'yuksek';
        riskRenk = 'orange';
      } else if (mevcutSelRiski >= 30) {
        riskSeviyesi = 'orta';
        riskRenk = 'yellow';
      }

      return res.json({
        success: true,
        data: {
          il_id: parseInt(il_id),
          il_adi: provinces.length > 0 ? provinces[0].il_adi : null,
          mevcut_sel_riski: mevcutSelRiski,
          yagis_24_saat: yagis24Saat,
          yagis_gelecek_7_gun: yagisGelecek7Gun,
          risk_seviyesi: riskSeviyesi,
          risk_renk: riskRenk,
          uyari: yagisGelecek7Gun > 50 ? 'Gelecek hafta yüksek yağış bekleniyor - Sel riski artabilir' :
                 yagis24Saat > 30 ? 'Yüksek yağış nedeniyle sel riski artmış olabilir' :
                 yagis24Saat > 15 ? 'Orta seviye yağış - sel riski takip edilmeli' : null
        }
      });
    } catch (error) {
      console.error('Sel riski durumu getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Sel riski durumu getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Gelecek 7 gün için sel riski uyarılarını getir
   * GET /api/flood-risk/warnings
   */
  static async getFloodRiskWarnings(req, res) {
    try {
      const [provinces] = await pool.query(
        'SELECT id, il_adi FROM iller WHERE bolge = "Marmara" ORDER BY il_adi'
      );

      const warnings = [];

      for (const province of provinces) {
        // Gelecek 7 günlük forecast verilerini al
        const forecasts = await WeatherModel.getForecastNext7Days(province.id);

        if (forecasts.length === 0) continue;

        // Her gün için yağış miktarını topla
        const dailyRainfall = {};
        forecasts.forEach(forecast => {
          const date = new Date(forecast.tarih_saat);
          const dateKey = date.toISOString().slice(0, 10); // YYYY-MM-DD

          if (!dailyRainfall[dateKey]) {
            dailyRainfall[dateKey] = 0;
          }
          dailyRainfall[dateKey] += parseFloat(forecast.yagis_miktari || 0);
        });

        // Yüksek yağış olan günleri bul
        for (const [date, rainfall] of Object.entries(dailyRainfall)) {
          const riskIncrease = calculateFloodRiskIncrease(rainfall);
          
          if (riskIncrease >= 15) { // Yüksek veya kritik risk
            const dateObj = new Date(date);
            warnings.push({
              il_id: province.id,
              il_adi: province.il_adi,
              tarih: date,
              tarih_formatted: dateObj.toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              tahmin_edilen_yagis: parseFloat(rainfall.toFixed(2)),
              risk_seviyesi: riskIncrease >= 25 ? 'kritik' : 'yuksek',
              risk_artisi: riskIncrease,
              uyari_mesaji: riskIncrease >= 25 
                ? `${province.il_adi} - ${dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihinde kritik sel riski bekleniyor (${rainfall.toFixed(1)} mm yağış)`
                : `${province.il_adi} - ${dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihinde yüksek sel riski bekleniyor (${rainfall.toFixed(1)} mm yağış)`
            });
          }
        }
      }

      // Tarihe göre sırala
      warnings.sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

      return res.json({
        success: true,
        data: warnings,
        count: warnings.length
      });
    } catch (error) {
      console.error('Sel riski uyarıları getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Sel riski uyarıları getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Tam sel riski analizini yap (4 yıllık ortalama, normalize, risk sınıflandırması)
   * GET /api/flood-risk/analysis
   */
  static async getFloodRiskAnalysis(req, res) {
    try {
      const analysis = await FloodModel.performCompleteAnalysis();

      return res.json({
        success: true,
        data: analysis,
        count: analysis.length,
        summary: {
          total_provinces: analysis.length,
          priority_provinces: analysis.filter(item => item.is_priority).length,
          very_high_risk: analysis.filter(item => item.risk_level === 'very_high').length,
          high_risk: analysis.filter(item => item.risk_level === 'high').length,
          medium_risk: analysis.filter(item => item.risk_level === 'medium').length,
          low_risk: analysis.filter(item => item.risk_level === 'low').length,
          very_low_risk: analysis.filter(item => item.risk_level === 'very_low').length
        }
      });
    } catch (error) {
      console.error('Sel riski analizi yapılırken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Sel riski analizi yapılırken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Tablo formatında sel riski analizi getir
   * GET /api/flood-risk/table
   */
  static async getFloodRiskTable(req, res) {
    try {
      const analysis = await FloodModel.performCompleteAnalysis();

      // Tablo için uygun formata dönüştür
      const tableData = analysis.map(item => ({
        province: item.il_adi,
        average_flood_count: parseFloat(item.ortalama_sel_sayisi.toFixed(2)),
        normalized_score: parseFloat(item.normalized_score.toFixed(4)),
        risk_level: item.risk_level,
        risk_label: item.risk_label,
        risk_color: item.risk_color,
        is_priority: item.is_priority
      }));

      return res.json({
        success: true,
        data: tableData,
        count: tableData.length
      });
    } catch (error) {
      console.error('Sel riski tablosu getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Sel riski tablosu getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * İl bazında detaylı analiz getir (trend dahil)
   * GET /api/flood-risk/province/:ilId
   */
  static async getProvinceAnalysis(req, res) {
    try {
      const { ilId } = req.params;

      const analysis = await FloodModel.performCompleteAnalysis();
      const provinceData = analysis.find(item => item.il_id === parseInt(ilId));

      if (!provinceData) {
        return res.status(404).json({
          success: false,
          message: 'İl bulunamadı veya veri yok'
        });
      }

      // Yıllık trend verilerini getir
      const yearlyTrend = await FloodModel.getYearlyTrend(parseInt(ilId));

      return res.json({
        success: true,
        data: {
          ...provinceData,
          yearly_trend: yearlyTrend
        }
      });
    } catch (error) {
      console.error('İl bazında analiz getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'İl bazında analiz getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Tüm önerileri hesapla ve kaydet
   * POST /api/flood-risk/calculate-recommendations
   */
  static async calculateRecommendations(req, res) {
    try {
      // Önce analizi yap
      const analysis = await FloodModel.performCompleteAnalysis();
      
      // Önerileri hesapla ve kaydet
      const result = await FloodModel.calculateAndSaveAllRecommendations(analysis);

      return res.json({
        success: true,
        message: 'Sel önerileri hesaplandı ve kaydedildi',
        data: result
      });
    } catch (error) {
      console.error('Sel önerileri hesaplanırken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Sel önerileri hesaplanırken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Tüm önerileri getir
   * GET /api/flood-risk/recommendations
   */
  static async getRecommendations(req, res) {
    try {
      const recommendations = await FloodModel.getAllRecommendations();
      return res.json({
        success: true,
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      console.error('Sel önerileri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Sel önerileri getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * İl bazında önerileri getir
   * GET /api/flood-risk/recommendations/:ilId
   */
  static async getProvinceRecommendations(req, res) {
    try {
      const { ilId } = req.params;
      const recommendations = await FloodModel.getRecommendationsByProvince(parseInt(ilId));
      
      if (!recommendations) {
        return res.status(404).json({
          success: false,
          message: 'Bu il için öneri bulunamadı'
        });
      }

      return res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('İl bazında sel önerileri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'İl bazında sel önerileri getirilirken hata oluştu',
        error: error.message
      });
    }
  }
}

module.exports = FloodRiskController;
