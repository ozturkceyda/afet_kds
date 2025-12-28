const express = require('express');
const router = express.Router();
const FireController = require('../../controllers/fireController');

// Tüm yangınları getir
router.get('/', FireController.getAll);

// İl bazında yangınları getir
router.get('/province', FireController.getByProvinceId);

// Genel istatistikler
router.get('/statistics', FireController.getStatistics);

// İl bazında istatistikler
router.get('/statistics/by-province', FireController.getStatisticsByProvince);

// Aylık trend
router.get('/trend/monthly', FireController.getMonthlyTrend);

// Yangın nedenleri analizi
router.get('/analysis/causes', FireController.getCauseAnalysis);

// En riskli bölgeler
router.get('/risky-areas', FireController.getMostRiskyAreas);

// Son yangınlar
router.get('/recent', FireController.getRecentFires);

// Yıllık karşılaştırma
router.get('/comparison/yearly', FireController.getYearlyComparison);

// İl bazında detaylı analiz
router.get('/analysis/province', FireController.getProvinceDetailedAnalysis);

module.exports = router;

