const express = require('express');
const router = express.Router();
const RiskController = require('../../controllers/riskController');

// GET /api/risks?il_id=... - İl bazında risk skorlarını getir
router.get('/', RiskController.getByProvinceId);

// GET /api/risks/average?il_id=... - İl bazında ortalama risk skorlarını getir
router.get('/average', RiskController.getProvinceAverage);

// GET /api/risks/all-averages - Tüm illerin ortalama risk skorlarını getir
router.get('/all-averages', RiskController.getAllProvinceAverages);

module.exports = router;




















