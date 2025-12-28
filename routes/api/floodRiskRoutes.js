const express = require('express');
const router = express.Router();
const FloodRiskController = require('../../controllers/floodRiskController');

// İl bazında sel riski analizini çalıştır
router.post('/calculate', FloodRiskController.calculateFloodRisk);

// Tüm iller için sel riski analizini çalıştır
router.post('/calculate-all', FloodRiskController.calculateAllFloodRisks);

// İl bazında sel riski durumunu getir
router.get('/status', FloodRiskController.getFloodRiskStatus);

// Gelecek 7 gün için sel riski uyarılarını getir
router.get('/warnings', FloodRiskController.getFloodRiskWarnings);

// Tam sel riski analizi (4 yıllık ortalama, normalize, risk sınıflandırması)
router.get('/analysis', FloodRiskController.getFloodRiskAnalysis);

// Tablo formatında sel riski analizi
router.get('/table', FloodRiskController.getFloodRiskTable);

// İl bazında detaylı analiz (trend dahil)
router.get('/province/:ilId', FloodRiskController.getProvinceAnalysis);

// Önerileri hesapla ve kaydet
router.post('/calculate-recommendations', FloodRiskController.calculateRecommendations);

// Tüm önerileri getir
router.get('/recommendations', FloodRiskController.getRecommendations);

// İl bazında önerileri getir
router.get('/recommendations/:ilId', FloodRiskController.getProvinceRecommendations);

module.exports = router;

