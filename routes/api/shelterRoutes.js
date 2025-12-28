const express = require('express');
const router = express.Router();
const ShelterController = require('../../controllers/shelterController');

// GET /api/shelters/total - Tüm barınma merkezlerinin toplam kapasitelerini getir
router.get('/total', ShelterController.getTotalCapacities);

// GET /api/shelters?il_id=... - İl bazında barınma merkezlerini getir
router.get('/', ShelterController.getByProvinceId);

module.exports = router;

