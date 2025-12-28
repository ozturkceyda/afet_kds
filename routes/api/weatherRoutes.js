const express = require('express');
const router = express.Router();
const WeatherController = require('../../controllers/weatherController');

// İl bazında hava durumu verileri
router.get('/', WeatherController.getByProvinceId);

// Tüm Marmara illeri için son hava durumu verileri
router.get('/all-marmara', WeatherController.getAllMarmara);

// İl bazında hava durumu istatistikleri
router.get('/statistics', WeatherController.getStatistics);

// Tüm Marmara illeri için tahmin verileri (son 7 gün)
router.get('/all-forecast', WeatherController.getForecast);

// Tüm Marmara illeri için gerçek zamanlı hava durumu verilerini çek (API'den direkt)
router.get('/current-marmara', WeatherController.getCurrentWeatherMarmara);

// Son 5 günün gerçek hava durumu verilerini getir (veritabanından)
router.get('/last-5-days', WeatherController.getLast5Days);

// Belirli tarih aralığı için hava durumu verilerini getir
router.get('/date-range', WeatherController.getWeatherByDateRange);

module.exports = router;
