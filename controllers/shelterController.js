const ShelterCenterModel = require('../models/ShelterCenterModel');

class ShelterController {
  // Tüm barınma merkezlerinin toplam kapasitelerini getir
  static async getTotalCapacities(req, res) {
    try {
      const capacities = await ShelterCenterModel.getTotalCapacities();
      
      res.json({
        success: true,
        data: capacities,
        count: capacities.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // İl bazında barınma merkezlerini getir
  static async getByProvinceId(req, res) {
    try {
      const { il_id } = req.query;
      
      if (!il_id) {
        return res.status(400).json({
          success: false,
          message: 'il_id parametresi gerekli'
        });
      }

      const capacities = await ShelterCenterModel.getByProvinceId(il_id);
      
      res.json({
        success: true,
        data: capacities,
        count: capacities.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = ShelterController;

