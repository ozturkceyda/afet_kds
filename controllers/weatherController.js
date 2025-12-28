const WeatherModel = require('../models/WeatherModel');
const { fetchAllMarmaraCurrentWeather } = require('../scripts/fetchLiveWeather');

class WeatherController {
  /**
   * İl ID'sine göre hava durumu verilerini getir
   */
  static async getByProvinceId(req, res) {
    try {
      const { il_id } = req.query;
      const limit = parseInt(req.query.limit) || 10;

      if (!il_id) {
        return res.status(400).json({
          success: false,
          message: 'il_id parametresi gerekli'
        });
      }

      const weatherData = await WeatherModel.getLatestByProvinceId(il_id, limit);

      return res.json({
        success: true,
        data: weatherData
      });
    } catch (error) {
      console.error('Hava durumu verileri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Hava durumu verileri getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Tüm Marmara illeri için son hava durumu verilerini getir
   */
  static async getAllMarmara(req, res) {
    try {
      const weatherData = await WeatherModel.getLatestForAllMarmara();

      return res.json({
        success: true,
        data: weatherData
      });
    } catch (error) {
      console.error('Hava durumu verileri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Hava durumu verileri getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * İl ID'sine göre hava durumu istatistiklerini getir
   */
  static async getStatistics(req, res) {
    try {
      const { il_id } = req.query;

      if (!il_id) {
        return res.status(400).json({
          success: false,
          message: 'il_id parametresi gerekli'
        });
      }

      const statistics = await WeatherModel.getStatisticsByProvinceId(il_id);

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Hava durumu istatistikleri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Hava durumu istatistikleri getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Tüm Marmara illeri için tahmin verilerini getir
   */
  static async getForecast(req, res) {
    try {
      const forecastData = await WeatherModel.getForecastForAllMarmara();

      return res.json({
        success: true,
        data: forecastData
      });
    } catch (error) {
      console.error('Tahmin verileri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Tahmin verileri getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Tüm Marmara illeri için gerçek zamanlı hava durumu verilerini çek (API'den)
   * Not: Bu endpoint API'den direkt veri çeker, veritabanına kaydetmez
   */
  static async getCurrentWeatherMarmara(req, res) {
    try {
      const results = await fetchAllMarmaraCurrentWeather();

      return res.json({
        success: true,
        data: results.data,
        summary: {
          success: results.success,
          failed: results.failed,
          saved: results.saved,
          updated: results.updated
        },
        errors: results.errors.length > 0 ? results.errors : undefined
      });
    } catch (error) {
      console.error('Gerçek zamanlı hava durumu verileri çekilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Gerçek zamanlı hava durumu verileri çekilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Son 5 günün gerçek hava durumu verilerini getir (veritabanından)
   */
  static async getLast5Days(req, res) {
    try {
      const weatherData = await WeatherModel.getLast5DaysForMarmara();

      return res.json({
        success: true,
        data: weatherData
      });
    } catch (error) {
      console.error('Son 5 günün hava durumu verileri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Son 5 günün hava durumu verileri getirilirken hata oluştu',
        error: error.message
      });
    }
  }

  /**
   * Belirli tarih aralığı için hava durumu verilerini getir
   */
  static async getWeatherByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate ve endDate parametreleri gerekli (YYYY-MM-DD formatında)'
        });
      }

      // Tarih formatını kontrol et
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Tarih formatı YYYY-MM-DD olmalıdır'
        });
      }

      const weatherData = await WeatherModel.getWeatherByDateRange(startDate, endDate);

      return res.json({
        success: true,
        data: weatherData,
        count: weatherData.length,
        startDate,
        endDate
      });
    } catch (error) {
      console.error('Tarih aralığı hava durumu verileri getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Tarih aralığı hava durumu verileri getirilirken hata oluştu',
        error: error.message
      });
    }
  }
}

module.exports = WeatherController;
