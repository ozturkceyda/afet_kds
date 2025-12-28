const express = require('express');
const router = express.Router();
const EarthquakeController = require('../../controllers/earthquakeController');

// İl bazında deprem verileri
router.get('/', EarthquakeController.getByProvinceId);

// İl bazında deprem istatistikleri
router.get('/statistics', EarthquakeController.getProvinceStatistics);

// En büyük depremler
router.get('/largest', EarthquakeController.getLargestEarthquakes);

// Son depremler
router.get('/recent', EarthquakeController.getRecentEarthquakes);

// Canlı depremler (son 24 saat)
router.get('/live', EarthquakeController.getLiveEarthquakes);

// Canlı deprem istatistikleri
router.get('/live/statistics', EarthquakeController.getLiveEarthquakeStatistics);

// Son 30 günlük il bazında deprem sayıları
router.get('/last30days', EarthquakeController.getLast30DaysByProvince);

// Manuel olarak AFAD verilerini çek
router.post('/fetch', EarthquakeController.fetchLiveEarthquakes);

module.exports = router;

