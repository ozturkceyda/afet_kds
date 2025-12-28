const EarthquakeModel = require('../models/EarthquakeModel');

class EarthquakeController {
  /**
   * İl bazında deprem verilerini getir
   * GET /api/earthquakes?il_id=1
   */
  static async getByProvinceId(req, res) {
    try {
      const { il_id } = req.query;
      
      if (!il_id) {
        return res.status(400).json({
          success: false,
          message: 'il_id parametresi gerekli'
        });
      }

      const earthquakes = await EarthquakeModel.getByProvinceId(parseInt(il_id));
      
      return res.json({
        success: true,
        data: earthquakes
      });
    } catch (error) {
      console.error('Deprem verileri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Deprem verileri getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * İl bazında deprem istatistiklerini getir
   * GET /api/earthquakes/statistics?il_id=1
   */
  static async getProvinceStatistics(req, res) {
    try {
      const { il_id } = req.query;
      
      if (!il_id) {
        return res.status(400).json({
          success: false,
          message: 'il_id parametresi gerekli'
        });
      }

      const statistics = await EarthquakeModel.getProvinceStatistics(parseInt(il_id));
      
      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Deprem istatistikleri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Deprem istatistikleri getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * En büyük depremleri getir
   * GET /api/earthquakes/largest?limit=10
   */
  static async getLargestEarthquakes(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const earthquakes = await EarthquakeModel.getLargestEarthquakes(limit);
      
      return res.json({
        success: true,
        data: earthquakes
      });
    } catch (error) {
      console.error('En büyük depremler getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'En büyük depremler getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Son depremleri getir
   * GET /api/earthquakes/recent?limit=10
   */
  static async getRecentEarthquakes(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const earthquakes = await EarthquakeModel.getRecentEarthquakes(limit);
      
      return res.json({
        success: true,
        data: earthquakes
      });
    } catch (error) {
      console.error('Son depremler getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Son depremler getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Canlı deprem verilerini getir (son 24 saat)
   * GET /api/earthquakes/live?limit=50
   */
  static async getLiveEarthquakes(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const earthquakes = await EarthquakeModel.getLiveEarthquakes(limit);
      
      return res.json({
        success: true,
        data: earthquakes
      });
    } catch (error) {
      console.error('Canlı depremler getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Canlı depremler getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * İl bazında canlı deprem verilerini getir
   * GET /api/earthquakes/live?il_id=1&limit=50
   */
  static async getLiveEarthquakesByProvince(req, res) {
    try {
      const { il_id } = req.query;
      
      if (!il_id) {
        return res.status(400).json({
          success: false,
          message: 'il_id parametresi gerekli'
        });
      }

      const limit = parseInt(req.query.limit) || 50;
      const earthquakes = await EarthquakeModel.getLiveEarthquakesByProvince(parseInt(il_id), limit);
      
      return res.json({
        success: true,
        data: earthquakes
      });
    } catch (error) {
      console.error('İl bazında canlı depremler getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'İl bazında canlı depremler getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Canlı deprem istatistikleri (son 24 saat)
   * GET /api/earthquakes/live/statistics
   */
  static async getLiveEarthquakeStatistics(req, res) {
    try {
      const statistics = await EarthquakeModel.getLiveEarthquakeStatistics();
      
      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Canlı deprem istatistikleri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Canlı deprem istatistikleri getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Son 30 günlük il bazında deprem sayılarını getir
   * GET /api/earthquakes/last30days
   */
  static async getLast30DaysByProvince(req, res) {
    try {
      const data = await EarthquakeModel.getLast30DaysByProvince();
      
      return res.json({
        success: true,
        data: data,
        count: data.length
      });
    } catch (error) {
      console.error('Son 30 günlük deprem verileri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Son 30 günlük deprem verileri getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Manuel olarak AFAD ve Kandilli'den deprem verilerini çek
   * POST /api/earthquakes/fetch
   */
  static async fetchLiveEarthquakes(req, res) {
    try {
      const { fetchFromKandilli, fetchFromAFAD, saveEarthquakes } = require('../../scripts/fetchLiveEarthquakes');
      
      // AFAD'dan veri çek (öncelikli)
      let afadData = [];
      let afadError = null;
      try {
        afadData = await fetchFromAFAD();
        console.log(`✅ AFAD: ${afadData.length} deprem verisi bulundu`);
      } catch (error) {
        afadError = error.message;
        console.log(`⚠️  AFAD'dan veri çekilemedi: ${error.message}`);
      }
      
      // Kandilli'den veri çek (yedek)
      let kandilliData = [];
      let kandilliError = null;
      try {
        kandilliData = await fetchFromKandilli();
        console.log(`✅ Kandilli: ${kandilliData.length} deprem verisi bulundu`);
      } catch (error) {
        kandilliError = error.message;
        console.log(`⚠️  Kandilli'den veri çekilemedi: ${error.message}`);
      }
      
      // Tüm verileri birleştir
      const allEarthquakes = [...afadData, ...kandilliData];
      
      let saved = 0;
      if (allEarthquakes.length > 0) {
        await saveEarthquakes(allEarthquakes);
        saved = allEarthquakes.length;
      }
      
      return res.json({
        success: true,
        message: 'Deprem verileri başarıyla çekildi',
        data: {
          afad: {
            count: afadData.length,
            error: afadError
          },
          kandilli: {
            count: kandilliData.length,
            error: kandilliError
          },
          total: allEarthquakes.length,
          saved: saved
        }
      });
    } catch (error) {
      console.error('Deprem verileri çekilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Deprem verileri çekilirken hata oluştu',
        error: error.message
      });
    }
  }
}

module.exports = EarthquakeController;

