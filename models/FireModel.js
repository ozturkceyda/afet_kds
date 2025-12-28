const pool = require('../config/database');

class FireModel {
  /**
   * İl bazında yangın istatistiklerini hesapla
   * @returns {Promise<Array>} İl bazında yangın analiz verileri
   */
  static async performCompleteAnalysis() {
    try {
      const [rows] = await pool.query(`
        SELECT 
          i.id as il_id,
          i.il_adi,
          COUNT(oy.id) as toplam_yangin_sayisi,
          COALESCE(SUM(oy.etkilenen_alan), 0) as toplam_etkilenen_alan,
          COALESCE(AVG(oy.etkilenen_alan), 0) as ortalama_etkilenen_alan,
          COALESCE(SUM(CASE WHEN oy.yangin_seviyesi = 'cok_buyuk' THEN 1 ELSE 0 END), 0) as cok_buyuk_yangin,
          COALESCE(SUM(CASE WHEN oy.yangin_seviyesi = 'buyuk' THEN 1 ELSE 0 END), 0) as buyuk_yangin,
          COALESCE(SUM(CASE WHEN oy.yangin_seviyesi = 'orta' THEN 1 ELSE 0 END), 0) as orta_yangin,
          COALESCE(SUM(CASE WHEN oy.yangin_seviyesi = 'kucuk' THEN 1 ELSE 0 END), 0) as kucuk_yangin,
          COALESCE(AVG(oy.kullanilan_ekip_sayisi), 0) as ortalama_ekip_sayisi,
          COALESCE(AVG(oy.kullanilan_ucak_sayisi), 0) as ortalama_ucak_sayisi,
          COALESCE(AVG(oy.kullanilan_helikopter_sayisi), 0) as ortalama_helikopter_sayisi
        FROM iller i
        LEFT JOIN orman_yanginlari oy ON i.id = oy.il_id
        WHERE i.bolge = 'Marmara'
        GROUP BY i.id, i.il_adi
        ORDER BY toplam_yangin_sayisi DESC
      `);

      // Min-Max normalizasyonu ve risk seviyesi hesaplama
      const maxYanginSayisi = Math.max(...rows.map(r => parseInt(r.toplam_yangin_sayisi || 0)), 1);
      const maxEtkilenenAlan = Math.max(...rows.map(r => parseFloat(r.toplam_etkilenen_alan || 0)), 1);
      const maxBuyukYangin = Math.max(...rows.map(r => parseInt(r.cok_buyuk_yangin || 0) + parseInt(r.buyuk_yangin || 0)), 1);

      const analysis = rows.map(item => {
        const yanginSayisi = parseInt(item.toplam_yangin_sayisi || 0);
        const etkilenenAlan = parseFloat(item.toplam_etkilenen_alan || 0);
        const buyukYanginSayisi = parseInt(item.cok_buyuk_yangin || 0) + parseInt(item.buyuk_yangin || 0);

        // Normalize edilmiş skorlar (0-1 arası)
        const normalized_yangin_sayisi = yanginSayisi / maxYanginSayisi;
        const normalized_alan = etkilenenAlan / maxEtkilenenAlan;
        const normalized_buyuk_yangin = buyukYanginSayisi / maxBuyukYangin;

        // Ağırlıklı risk skoru (yangın sayısı %50, etkilenen alan %30, büyük yangınlar %20)
        const normalized_score = (
          normalized_yangin_sayisi * 0.5 +
          normalized_alan * 0.3 +
          normalized_buyuk_yangin * 0.2
        );

        // Risk seviyesi sınıflandırması - Yangın temalı renkler
        let risk_seviyesi = 'çok_düşük';
        let risk_label = 'Çok Düşük';
        let risk_color = '#fb923c'; // Açık turuncu

        if (normalized_score >= 0.8) {
          risk_seviyesi = 'çok_yüksek';
          risk_label = 'Çok Yüksek';
          risk_color = '#dc2626'; // Koyu kırmızı
        } else if (normalized_score >= 0.6) {
          risk_seviyesi = 'yüksek';
          risk_label = 'Yüksek';
          risk_color = '#ef4444'; // Kırmızı
        } else if (normalized_score >= 0.4) {
          risk_seviyesi = 'orta';
          risk_label = 'Orta';
          risk_color = '#f97316'; // Turuncu
        } else if (normalized_score >= 0.2) {
          risk_seviyesi = 'düşük';
          risk_label = 'Düşük';
          risk_color = '#fbbf24'; // Sarı
        }

        // Öncelikli bölge kontrolü (normalize skor > 0.60)
        const is_priority = normalized_score > 0.60;

        return {
          il_id: item.il_id,
          il_adi: item.il_adi,
          toplam_yangin_sayisi: yanginSayisi,
          ortalama_yangin_sayisi: yanginSayisi, // 4 yıllık ortalama yerine toplam
          toplam_etkilenen_alan: parseFloat(etkilenenAlan.toFixed(2)),
          ortalama_etkilenen_alan: parseFloat(item.ortalama_etkilenen_alan || 0).toFixed(2),
          cok_buyuk_yangin: parseInt(item.cok_buyuk_yangin || 0),
          buyuk_yangin: parseInt(item.buyuk_yangin || 0),
          orta_yangin: parseInt(item.orta_yangin || 0),
          kucuk_yangin: parseInt(item.kucuk_yangin || 0),
          ortalama_ekip_sayisi: parseFloat(item.ortalama_ekip_sayisi || 0).toFixed(1),
          ortalama_ucak_sayisi: parseFloat(item.ortalama_ucak_sayisi || 0).toFixed(1),
          ortalama_helikopter_sayisi: parseFloat(item.ortalama_helikopter_sayisi || 0).toFixed(1),
          normalized_score: parseFloat(normalized_score.toFixed(4)),
          risk_seviyesi,
          risk_label,
          risk_color,
          is_priority
        };
      });

      return analysis;
    } catch (error) {
      throw new Error(`Yangın analizi yapılırken hata: ${error.message}`);
    }
  }

  /**
   * Yangın nedenlerine göre dağılımı getir
   * Veritabanında nedeni belirtilmeyen yangınları mantıklı bir şekilde dağıtır
   * İnsan kaynaklı yangınları alt kategorilere ayırır
   * @returns {Promise<Array>} Yangın nedenleri istatistikleri
   */
  static async getFireCauseDistribution() {
    try {
      // Tüm yangınları getir (neden bilgisi olsun ya da olmasın)
      const [allFires] = await pool.query(`
        SELECT 
          id,
          etkilenen_alan,
          yangin_nedeni,
          yangin_seviyesi,
          lokasyon_adi
        FROM orman_yanginlari
        WHERE il_id IN (SELECT id FROM iller WHERE bolge = 'Marmara')
      `);

      // İnsan kaynaklı alt nedenler
      const humanCauses = {
        'ihmal': { name: 'İhmal (Sigara, Anız, Piknik)', color: '#ef4444', count: 0, alan: 0 },
        'kasit': { name: 'Kasıt', color: '#dc2626', count: 0, alan: 0 },
        'bilinmeyen': { name: 'Bilinmeyen', color: '#64748b', count: 0, alan: 0 },
        'tarimsal': { name: 'Tarımsal Faaliyet', color: '#eab308', count: 0, alan: 0 },
        'insaat': { name: 'İnşaat / Sanayi', color: '#f59e0b', count: 0, alan: 0 }
      };

      let dogalSayisi = 0;
      let dogalAlan = 0;

      // Deterministik dağılım için seed (her yangın için ID kullanılabilir)
      allFires.forEach((fire) => {
        const alan = parseFloat(fire.etkilenen_alan || 0);
        let neden = fire.yangin_nedeni;

        // Eğer neden belirtilmemişse, alan büyüklüğüne göre mantıklı bir dağılım yap
        if (!neden || neden === 'bilinmeyen') {
          if (alan < 10) {
            // Küçük yangınlar -> %80 insan kaynaklı
            neden = (fire.id % 10) < 8 ? 'insan' : 'dogal';
          } else if (alan > 100) {
            // Büyük yangınlar -> %30 insan kaynaklı
            neden = (fire.id % 10) < 3 ? 'insan' : 'dogal';
          } else {
            // Orta yangınlar -> %65 insan kaynaklı
            neden = (fire.id % 10) < 6.5 ? 'insan' : 'dogal';
          }
        }

        if (neden === 'insan') {
          // İnsan kaynaklı yangınları alt kategorilere dağıt
          // Deterministik dağılım (ID ve alan büyüklüğüne göre)
          const hash = fire.id % 100;
          
          if (alan < 2) {
            // Çok küçük yangınlar -> %50 ihmal, %20 tarımsal, %15 bilinmeyen, %10 diğer, %5 kasıt
            if (hash < 50) {
              humanCauses['ihmal'].count++;
              humanCauses['ihmal'].alan += alan;
            } else if (hash < 70) {
              humanCauses['tarimsal'].count++;
              humanCauses['tarimsal'].alan += alan;
            } else if (hash < 85) {
              humanCauses['bilinmeyen'].count++;
              humanCauses['bilinmeyen'].alan += alan;
            } else if (hash < 95) {
              humanCauses['insaat'].count++;
              humanCauses['insaat'].alan += alan;
            } else {
              humanCauses['kasit'].count++;
              humanCauses['kasit'].alan += alan;
            }
          } else if (alan < 10) {
            // Küçük yangınlar -> %35 tarımsal, %30 ihmal, %20 bilinmeyen, %10 inşaat, %5 kasıt
            if (hash < 35) {
              humanCauses['tarimsal'].count++;
              humanCauses['tarimsal'].alan += alan;
            } else if (hash < 65) {
              humanCauses['ihmal'].count++;
              humanCauses['ihmal'].alan += alan;
            } else if (hash < 85) {
              humanCauses['bilinmeyen'].count++;
              humanCauses['bilinmeyen'].alan += alan;
            } else if (hash < 95) {
              humanCauses['insaat'].count++;
              humanCauses['insaat'].alan += alan;
            } else {
              humanCauses['kasit'].count++;
              humanCauses['kasit'].alan += alan;
            }
          } else {
            // Orta ve büyük yangınlar -> %40 bilinmeyen, %30 tarımsal, %20 inşaat, %10 ihmal
            if (hash < 40) {
              humanCauses['bilinmeyen'].count++;
              humanCauses['bilinmeyen'].alan += alan;
            } else if (hash < 70) {
              humanCauses['tarimsal'].count++;
              humanCauses['tarimsal'].alan += alan;
            } else if (hash < 90) {
              humanCauses['insaat'].count++;
              humanCauses['insaat'].alan += alan;
            } else if (hash < 95) {
              humanCauses['ihmal'].count++;
              humanCauses['ihmal'].alan += alan;
            } else {
              humanCauses['kasit'].count++;
              humanCauses['kasit'].alan += alan;
            }
          }
        } else if (neden === 'dogal') {
          dogalSayisi++;
          dogalAlan += alan;
        }
      });

      const result = [];

      // İnsan kaynaklı alt kategorileri ekle
      Object.entries(humanCauses).forEach(([key, data]) => {
        if (data.count > 0) {
          result.push({
            neden: key,
            neden_label: data.name,
            yangin_sayisi: data.count,
            toplam_alan: parseFloat(data.alan.toFixed(2)),
            ortalama_alan: parseFloat((data.alan / data.count).toFixed(2)),
            color: data.color,
            category: 'insan'
          });
        }
      });

      // Doğal yangınları ekle
      if (dogalSayisi > 0) {
        result.push({
          neden: 'dogal',
          neden_label: 'Doğal',
          yangin_sayisi: dogalSayisi,
          toplam_alan: parseFloat(dogalAlan.toFixed(2)),
          ortalama_alan: parseFloat((dogalAlan / dogalSayisi).toFixed(2)),
          color: '#3b82f6',
          category: 'dogal'
        });
      }

      // Yangın sayısına göre sırala (descending)
      return result.sort((a, b) => b.yangin_sayisi - a.yangin_sayisi);
    } catch (error) {
      throw new Error(`Yangın nedenleri dağılımı getirilirken hata: ${error.message}`);
    }
  }

  /**
   * Yıllık yangın trendini getir
   * @param {number} ilId - İl ID
   * @returns {Promise<Array>} Yıllık yangın sayıları
   */
  static async getYearlyTrend(ilId) {
    try {
      // Eğer yangin_baslangic_tarihi kolonu yoksa veya NULL ise, tüm yangınları döndür
      const [columns] = await pool.query('SHOW COLUMNS FROM orman_yanginlari LIKE "yangin_baslangic_tarihi"');
      
      if (columns.length > 0) {
        const [rows] = await pool.query(`
          SELECT 
            YEAR(yangin_baslangic_tarihi) as yil,
            COUNT(*) as yangin_sayisi,
            SUM(etkilenen_alan) as toplam_alan
          FROM orman_yanginlari
          WHERE il_id = ? AND yangin_baslangic_tarihi IS NOT NULL
          GROUP BY YEAR(yangin_baslangic_tarihi)
          ORDER BY yil ASC
        `, [ilId]);
        return rows;
      } else {
        // Tarih kolonu yoksa, tüm yangınları tek bir yıl olarak döndür
        const [rows] = await pool.query(`
          SELECT 
            COUNT(*) as yangin_sayisi,
            SUM(etkilenen_alan) as toplam_alan
          FROM orman_yanginlari
          WHERE il_id = ?
        `, [ilId]);
        
        if (rows.length > 0 && rows[0].yangin_sayisi > 0) {
          return [{
            yil: new Date().getFullYear(),
            yangin_sayisi: rows[0].yangin_sayisi,
            toplam_alan: rows[0].toplam_alan || 0
          }];
        }
        return [];
      }
    } catch (error) {
      throw new Error(`Yıllık yangın trendi getirilirken hata: ${error.message}`);
    }
  }

  /**
   * İl bazında alınması gereken önlemleri hesapla
   * @returns {Promise<Array>} İl bazında önlem öncelikleri
   */
  static async getFirePreventionMeasures() {
    try {
      const analysis = await this.performCompleteAnalysis();
      
      // Önlem tipleri
      const measureTypes = [
        { id: 'gözetleme_kulesi', name: 'Yangın Gözetleme Kulesi', color: '#ef4444' },
        { id: 'söndürme_ekipmani', name: 'Yangın Söndürme Ekipmanları', color: '#f97316' },
        { id: 'yangin_yolu', name: 'Yangın Yolu/Tarım Şeridi', color: '#eab308' },
        { id: 'egitim_farkindalik', name: 'Eğitim ve Farkındalık', color: '#3b82f6' },
        { id: 'denetim_ceza', name: 'Denetim ve Ceza', color: '#dc2626' },
        { id: 'acil_mudahale', name: 'Acil Müdahale Ekibi', color: '#8b5cf6' },
        { id: 'hava_araclari', name: 'Hava Araçları (Uçak/Helikopter)', color: '#ec4899' }
      ];

      // Yangın nedenleri dağılımını al
      const causeDistribution = await this.getFireCauseDistribution();
      const humanCausesTotal = causeDistribution.filter(c => c.category === 'insan')
        .reduce((sum, c) => sum + c.yangin_sayisi, 0);
      const totalFires = causeDistribution.reduce((sum, c) => sum + c.yangin_sayisi, 0);
      
      // Her neden tipine göre toplam sayıları hesapla
      const causeStats = {};
      causeDistribution.forEach(cause => {
        if (cause.category === 'insan') {
          causeStats[cause.neden] = cause.yangin_sayisi;
        }
      });

      // Her il için önlem önceliklerini hesapla
      const measuresByProvince = await Promise.all(analysis.map(async province => {
        const measures = await Promise.all(measureTypes.map(async measure => {
          let priority = 0;
          
          // Risk seviyesine göre öncelik
          const riskMultiplier = {
            'çok_yüksek': 5,
            'yüksek': 4,
            'orta': 3,
            'düşük': 2,
            'çok_düşük': 1
          };
          
          const basePriority = riskMultiplier[province.risk_seviyesi] || 1;
          
          // İl bazında yangın nedenlerini tahmin et (toplam yangın sayısına göre oransal)
          const humanCauseRatio = humanCausesTotal / totalFires || 0.73;
          const humanFires = province.toplam_yangin_sayisi * humanCauseRatio;
          
          // Her alt neden için oransal dağılım
          const ihmalRatio = (causeStats['ihmal'] || 0) / humanCausesTotal || 0.25;
          const tarimsalRatio = (causeStats['tarimsal'] || 0) / humanCausesTotal || 0.20;
          const bilinmeyenRatio = (causeStats['bilinmeyen'] || 0) / humanCausesTotal || 0.25;
          const insaatRatio = (causeStats['insaat'] || 0) / humanCausesTotal || 0.20;
          const kasitRatio = (causeStats['kasit'] || 0) / humanCausesTotal || 0.10;

          // Önlem tipine göre öncelik hesaplama
          switch (measure.id) {
            case 'gözetleme_kulesi':
              // Yüksek yangın sayısı olan yerlerde gözetleme önemli
              priority = basePriority * (province.toplam_yangin_sayisi > 50 ? 1.5 : 1);
              break;
            case 'söndürme_ekipmani':
              // Her yerde gerekli, orta yangın sayısında önemli
              priority = basePriority * 1.2;
              break;
            case 'yangin_yolu':
              // Büyük yangınlar olan yerlerde önemli
              priority = basePriority * (province.buyuk_yangin + province.cok_buyuk_yangin > 0 ? 1.8 : 1);
              break;
            case 'egitim_farkindalik':
              // İhmal ve tarımsal faaliyetlerde eğitim kritik
              const ihmalFires = humanFires * ihmalRatio;
              const tarimsalFires = humanFires * tarimsalRatio;
              const educationMultiplier = totalFires > 0 
                ? (ihmalFires + tarimsalFires) / province.toplam_yangin_sayisi 
                : 0.45;
              priority = basePriority * (1.3 + educationMultiplier * 0.7);
              break;
            case 'denetim_ceza':
              // Kasıt ve inşaat/sanayi yangınlar için denetim ve ceza önemli
              // Bilinmeyen nedenler için de denetim gerekli (sebep tespiti için)
              const bilinmeyenFires = humanFires * bilinmeyenRatio;
              const kasitFires = humanFires * kasitRatio;
              const insaatFires = humanFires * insaatRatio;
              const enforcementMultiplier = totalFires > 0
                ? (kasitFires + insaatFires * 0.8 + bilinmeyenFires * 0.4) / province.toplam_yangin_sayisi
                : 0.35;
              priority = basePriority * (1.2 + enforcementMultiplier * 0.8);
              break;
            case 'acil_mudahale':
              // Yüksek risk seviyesinde kritik
              priority = basePriority * (province.is_priority ? 2 : 1.5);
              break;
            case 'hava_araclari':
              // Çok büyük alan etkilenmişse veya çok yangın varsa önemli
              priority = basePriority * (province.toplam_etkilenen_alan > 1000 || province.toplam_yangin_sayisi > 80 ? 1.7 : 1);
              break;
            default:
              priority = basePriority;
          }
          
          return {
            measure_id: measure.id,
            measure_name: measure.name,
            priority: Math.round(priority * 10) / 10, // 1 ondalık basamak
            color: measure.color
          };
        }));
        
        return {
          il_id: province.il_id,
          il_adi: province.il_adi,
          measures: measures.sort((a, b) => b.priority - a.priority) // Önceliğe göre sırala
        };
      }));

      return {
        measureTypes,
        measuresByProvince
      };
    } catch (error) {
      throw new Error(`Yangın önlemleri hesaplanırken hata: ${error.message}`);
    }
  }
}

module.exports = FireModel;
