const express = require('express');
const router = express.Router();
const ProvinceController = require('../../controllers/provinceController');

// GET /api/provinces - Tüm illeri getir
router.get('/', ProvinceController.getAll);

// GET /api/provinces/marmara - Marmara bölgesi illerini getir
router.get('/marmara', ProvinceController.getMarmaraProvinces);

// GET /api/provinces/:id/routes - Hedef ile en kısa rotaları getir
router.get('/:id/routes', ProvinceController.getShortestRoutes);

// GET /api/provinces/:id - ID'ye göre il getir
router.get('/:id', ProvinceController.getById);

module.exports = router;










