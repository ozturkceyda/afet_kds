const FireModel = require('../models/FireModel');

class FireRiskController {
  /**
   * Tüm yangın risk analizini getir
   * GET /api/fire-risk/analysis
   */
  static async getAnalysis(req, res) {
    try {
      const analysis = await FireModel.performCompleteAnalysis();
      res.json({
        success: true,
        data: analysis,
        count: analysis.length
      });
    } catch (error) {
      console.error('Yangın analizi hatası:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Tablo formatında yangın verilerini getir
   * GET /api/fire-risk/table
   */
  static async getTableData(req, res) {
    try {
      const analysis = await FireModel.performCompleteAnalysis();
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Yangın tablo verisi hatası:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * İl bazında detaylı yangın analizi getir
   * GET /api/fire-risk/province/:ilId
   */
  static async getProvinceAnalysis(req, res) {
    try {
      const { ilId } = req.params;
      const analysis = await FireModel.performCompleteAnalysis();
      const provinceData = analysis.find(item => item.il_id === parseInt(ilId));

      if (!provinceData) {
        return res.status(404).json({
          success: false,
          message: 'İl bulunamadı'
        });
      }

      // Yıllık trend verisi
      const yearlyTrend = await FireModel.getYearlyTrend(ilId);

      res.json({
        success: true,
        data: {
          ...provinceData,
          yearlyTrend
        }
      });
    } catch (error) {
      console.error('İl bazında yangın analizi hatası:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Yangın nedenlerine göre dağılımı getir
   * GET /api/fire-risk/cause-distribution
   */
  static async getCauseDistribution(req, res) {
    try {
      const distribution = await FireModel.getFireCauseDistribution();
      res.json({
        success: true,
        data: distribution
      });
    } catch (error) {
      console.error('Yangın nedenleri dağılımı hatası:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Alınması gereken önlemleri getir
   * GET /api/fire-risk/prevention-measures
   */
  static async getPreventionMeasures(req, res) {
    try {
      const measures = await FireModel.getFirePreventionMeasures();
      res.json({
        success: true,
        data: measures
      });
    } catch (error) {
      console.error('Yangın önlemleri hatası:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = FireRiskController;

