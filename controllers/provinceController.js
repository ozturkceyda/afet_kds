const ProvinceModel = require('../models/ProvinceModel');

class ProvinceController {
  // Tüm illeri getir
  static async getAll(req, res) {
    try {
      const provinces = await ProvinceModel.getAll();
      res.json({
        success: true,
        data: provinces,
        count: provinces.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ID'ye göre il getir
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const province = await ProvinceModel.getById(id);
      
      if (!province) {
        return res.status(404).json({
          success: false,
          message: 'İl bulunamadı'
        });
      }

      res.json({
        success: true,
        data: province
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Marmara bölgesi illerini getir
  static async getMarmaraProvinces(req, res) {
    try {
      const provinces = await ProvinceModel.getMarmaraProvinces();
      res.json({
        success: true,
        data: provinces,
        count: provinces.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Hedef ile en kısa rotaları getir
  static async getShortestRoutes(req, res) {
    try {
      const { id } = req.params;
      const routeData = await ProvinceModel.getShortestRoutes(id);
      
      res.json({
        success: true,
        data: routeData.all || routeData, // Geriye uyumluluk
        main: routeData.main || routeData,
        all: routeData.all || routeData,
        count: routeData.all ? routeData.all.length : (routeData.length || 0)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = ProvinceController;












