const RiskScoreModel = require('../models/RiskScoreModel');

class RiskController {
  // İl bazında risk skorlarını getir
  static async getByProvinceId(req, res) {
    try {
      const { il_id } = req.query;
      
      if (!il_id) {
        return res.status(400).json({
          success: false,
          message: 'il_id parametresi gerekli'
        });
      }

      const riskScores = await RiskScoreModel.getByProvinceId(il_id);
      
      res.json({
        success: true,
        data: riskScores,
        count: riskScores.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // İl bazında ortalama risk skorlarını getir
  static async getProvinceAverage(req, res) {
    try {
      const { il_id } = req.query;
      
      console.log(`📥 [getProvinceAverage] Request received - il_id: ${il_id}`);
      
      if (!il_id) {
        console.warn(`⚠️ [getProvinceAverage] Missing il_id parameter`);
        return res.status(400).json({
          success: false,
          message: 'il_id parametresi gerekli',
          errorCode: 'MISSING_PARAMETER'
        });
      }

      // Validate il_id is a number
      const ilIdNum = parseInt(il_id);
      if (isNaN(ilIdNum)) {
        console.warn(`⚠️ [getProvinceAverage] Invalid il_id format: ${il_id}`);
        return res.status(400).json({
          success: false,
          message: 'il_id geçerli bir sayı olmalıdır',
          errorCode: 'INVALID_PARAMETER'
        });
      }

      console.log(`🔍 [getProvinceAverage] Fetching average for il_id: ${ilIdNum}`);
      const average = await RiskScoreModel.getProvinceAverage(ilIdNum);
      
      if (!average) {
        console.warn(`⚠️ [getProvinceAverage] No data found for il_id: ${ilIdNum}`);
        return res.status(404).json({
          success: false,
          message: `İl ID ${ilIdNum} için risk skoru bulunamadı`,
          errorCode: 'NOT_FOUND',
          il_id: ilIdNum
        });
      }

      // Ensure all fields have default values
      const responseData = {
        il_id: average.il_id || ilIdNum,
        il_adi: average.il_adi || null,
        ortalama_deprem_riski: parseFloat(average.ortalama_deprem_riski || 0),
        ortalama_sel_riski: parseFloat(average.ortalama_sel_riski || 0),
        ortalama_yangin_riski: parseFloat(average.ortalama_yangin_riski || 0),
        ortalama_genel_risk_skoru: parseFloat(average.ortalama_genel_risk_skoru || 0),
        ilce_sayisi: parseInt(average.ilce_sayisi || 0)
      };

      console.log(`✅ [getProvinceAverage] Success - il_id: ${ilIdNum}, il_adi: ${responseData.il_adi}`);
      
      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error(`❌ [getProvinceAverage] Error:`, error);
      console.error(`❌ [getProvinceAverage] Error stack:`, error.stack);
      res.status(500).json({
        success: false,
        message: error.message || 'Sunucu hatası',
        errorCode: 'SERVER_ERROR',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Tüm illerin ortalama risk skorlarını getir
  static async getAllProvinceAverages(req, res) {
    try {
      const averages = await RiskScoreModel.getAllProvinceAverages();
      
      res.json({
        success: true,
        data: averages,
        count: averages.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = RiskController;















