const express = require('express');
const router = express.Router();
const FireRiskController = require('../../controllers/fireRiskController');

// GET /api/fire-risk/analysis - Tüm yangın risk analizi
router.get('/analysis', FireRiskController.getAnalysis);

// GET /api/fire-risk/table - Tablo formatında yangın verileri
router.get('/table', FireRiskController.getTableData);

// GET /api/fire-risk/province/:ilId - İl bazında detaylı yangın analizi
router.get('/province/:ilId', FireRiskController.getProvinceAnalysis);

// GET /api/fire-risk/cause-distribution - Yangın nedenlerine göre dağılım
router.get('/cause-distribution', FireRiskController.getCauseDistribution);

// GET /api/fire-risk/prevention-measures - Alınması gereken önlemler
router.get('/prevention-measures', FireRiskController.getPreventionMeasures);

module.exports = router;

