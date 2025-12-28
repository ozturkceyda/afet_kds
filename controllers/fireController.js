const FireModel = require('../models/FireModel');

class FireController {
    // Tüm yangınları getir
    static async getAll(req, res) {
        try {
            const { limit } = req.query;
            const fires = await FireModel.getAll(limit);
            return res.json({
                success: true,
                data: fires,
                count: fires.length
            });
        } catch (error) {
            console.error('Orman yangınları getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'Orman yangınları getirilirken hata oluştu',
                error: error.message
            });
        }
    }

    // İl bazında yangınları getir
    static async getByProvinceId(req, res) {
        try {
            const { il_id, limit } = req.query;
            if (!il_id) {
                return res.status(400).json({
                    success: false,
                    message: 'il_id parametresi gerekli'
                });
            }
            const fires = await FireModel.getByProvinceId(il_id, limit);
            return res.json({
                success: true,
                data: fires,
                count: fires.length
            });
        } catch (error) {
            console.error('İl bazında yangınlar getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'İl bazında yangınlar getirilirken hata oluştu',
                error: error.message
            });
        }
    }

    // Genel istatistikler
    static async getStatistics(req, res) {
        try {
            const stats = await FireModel.getStatistics();
            return res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('İstatistikler getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'İstatistikler getirilirken hata oluştu',
                error: error.message
            });
        }
    }

    // İl bazında istatistikler
    static async getStatisticsByProvince(req, res) {
        try {
            const stats = await FireModel.getStatisticsByProvince();
            return res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('İl bazında istatistikler getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'İl bazında istatistikler getirilirken hata oluştu',
                error: error.message
            });
        }
    }

    // Aylık trend
    static async getMonthlyTrend(req, res) {
        try {
            const { year } = req.query;
            const trend = await FireModel.getMonthlyTrend(year);
            return res.json({
                success: true,
                data: trend
            });
        } catch (error) {
            console.error('Aylık trend getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'Aylık trend getirilirken hata oluştu',
                error: error.message
            });
        }
    }

    // Yangın nedenleri analizi
    static async getCauseAnalysis(req, res) {
        try {
            const analysis = await FireModel.getCauseAnalysis();
            return res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            console.error('Yangın nedenleri analizi getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'Yangın nedenleri analizi getirilirken hata oluştu',
                error: error.message
            });
        }
    }

    // En riskli bölgeler
    static async getMostRiskyAreas(req, res) {
        try {
            const { limit } = req.query;
            const areas = await FireModel.getMostRiskyAreas(limit || 5);
            return res.json({
                success: true,
                data: areas
            });
        } catch (error) {
            console.error('En riskli bölgeler getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'En riskli bölgeler getirilirken hata oluştu',
                error: error.message
            });
        }
    }

    // Son yangınlar
    static async getRecentFires(req, res) {
        try {
            const { days } = req.query;
            const fires = await FireModel.getRecentFires(days || 30);
            return res.json({
                success: true,
                data: fires
            });
        } catch (error) {
            console.error('Son yangınlar getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'Son yangınlar getirilirken hata oluştu',
                error: error.message
            });
        }
    }

    // Yıllık karşılaştırma
    static async getYearlyComparison(req, res) {
        try {
            const comparison = await FireModel.getYearlyComparison();
            return res.json({
                success: true,
                data: comparison
            });
        } catch (error) {
            console.error('Yıllık karşılaştırma getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'Yıllık karşılaştırma getirilirken hata oluştu',
                error: error.message
            });
        }
    }

    // İl bazında detaylı analiz
    static async getProvinceDetailedAnalysis(req, res) {
        try {
            const { il_id } = req.query;
            if (!il_id) {
                return res.status(400).json({
                    success: false,
                    message: 'il_id parametresi gerekli'
                });
            }
            const analysis = await FireModel.getProvinceDetailedAnalysis(il_id);
            return res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            console.error('İl detaylı analiz getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'İl detaylı analiz getirilirken hata oluştu',
                error: error.message
            });
        }
    }
}

module.exports = FireController;
