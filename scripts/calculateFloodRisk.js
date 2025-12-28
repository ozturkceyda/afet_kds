/**
 * Sel Riski Analizi Scripti
 * 
 * Bu script hava durumu verilerindeki yağış miktarını analiz ederek
 * sel riski skorlarını hesaplar ve risk_skorlari tablosunu günceller.
 * 
 * Kullanım:
 *   node scripts/calculateFloodRisk.js
 * 
 * Otomatik çalıştırma için:
 *   - Hava durumu script'i ile birlikte çalıştırılabilir
 *   - Her 1 saatte bir otomatik çalıştırılabilir
 */

const pool = require('../config/database');
const RiskScoreModel = require('../models/RiskScoreModel');

/**
 * Yağış miktarına göre sel riski artışını hesapla
 * @param {number} yagisMiktari - Yağış miktarı (mm)
 * @returns {number} - Sel riski artışı (0-30 arası)
 */
function calculateFloodRiskIncrease(yagisMiktari) {
  if (!yagisMiktari || yagisMiktari <= 0) {
    return 0;
  }

  // Yağış miktarına göre risk artışı
  if (yagisMiktari < 5) {
    return 0; // Normal - risk artışı yok
  } else if (yagisMiktari < 15) {
    return 5; // Orta risk - 5 puan artış
  } else if (yagisMiktari < 30) {
    return 15; // Yüksek risk - 15 puan artış
  } else if (yagisMiktari < 50) {
    return 25; // Çok yüksek risk - 25 puan artış
  } else {
    return 30; // Kritik risk - 30 puan artış (maksimum)
  }
}

/**
 * Son 24 saatteki toplam yağış miktarını hesapla
 * @param {number} ilId - İl ID
 * @returns {Promise<number>} - Toplam yağış miktarı (mm)
 */
async function getTotalRainfallLast24Hours(ilId) {
  try {
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(yagis_miktari), 0) as toplam_yagis
       FROM hava_durumu_canli
       WHERE il_id = ?
       AND tarih_saat >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [ilId]
    );
    return parseFloat(rows[0]?.toplam_yagis || 0);
  } catch (error) {
    console.error(`Toplam yağış hesaplanırken hata (il_id: ${ilId}):`, error.message);
    return 0;
  }
}

/**
 * Son 7 gündeki toplam yağış miktarını hesapla
 * @param {number} ilId - İl ID
 * @returns {Promise<number>} - Toplam yağış miktarı (mm)
 */
async function getTotalRainfallLast7Days(ilId) {
  try {
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(yagis_miktari), 0) as toplam_yagis
       FROM hava_durumu_canli
       WHERE il_id = ?
       AND tarih_saat >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [ilId]
    );
    return parseFloat(rows[0]?.toplam_yagis || 0);
  } catch (error) {
    console.error(`7 günlük yağış hesaplanırken hata (il_id: ${ilId}):`, error.message);
    return 0;
  }
}

/**
 * İl için mevcut sel riski skorunu al
 * @param {number} ilId - İl ID
 * @returns {Promise<number|null>} - Mevcut sel riski skoru
 */
async function getCurrentFloodRisk(ilId) {
  try {
    const [rows] = await pool.query(
      `SELECT AVG(sel_riski) as ortalama_sel_riski
       FROM risk_skorlari
       WHERE il_id = ?
       GROUP BY il_id`,
      [ilId]
    );
    return rows.length > 0 ? parseFloat(rows[0]?.ortalama_sel_riski || 0) : null;
  } catch (error) {
    console.error(`Mevcut sel riski alınırken hata (il_id: ${ilId}):`, error.message);
    return null;
  }
}

/**
 * Gelecek 7 gündeki toplam tahmin edilen yağış miktarını hesapla
 * @param {number} ilId - İl ID
 * @returns {Promise<number>} - Toplam tahmin edilen yağış miktarı (mm)
 */
async function getForecastRainfallNext7Days(ilId) {
  try {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + 7);

    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(yagis_miktari), 0) as toplam_yagis
       FROM hava_durumu_canli
       WHERE il_id = ?
       AND tarih_saat >= NOW()
       AND tarih_saat <= ?`,
      [ilId, futureDate.toISOString().slice(0, 19).replace('T', ' ')]
    );
    return parseFloat(rows[0]?.toplam_yagis || 0);
  } catch (error) {
    console.error(`Gelecek 7 günlük yağış hesaplanırken hata (il_id: ${ilId}):`, error.message);
    return 0;
  }
}

/**
 * İl için sel riski skorunu hesapla ve güncelle
 * @param {number} ilId - İl ID
 * @param {string} ilAdi - İl adı
 * @returns {Promise<object>} - Güncelleme sonucu
 */
async function calculateAndUpdateFloodRisk(ilId, ilAdi) {
  try {
    // Mevcut sel riski skorunu al
    const mevcutSelRiski = await getCurrentFloodRisk(ilId);
    
    // Eğer mevcut skor yoksa, varsayılan değer kullan
    const baseSelRiski = mevcutSelRiski || 10; // Varsayılan 10

    // Son 24 saatteki toplam yağış
    const yagis24Saat = await getTotalRainfallLast24Hours(ilId);
    
    // Son 7 gündeki toplam yağış
    const yagis7Gun = await getTotalRainfallLast7Days(ilId);

    // Gelecek 7 gündeki tahmin edilen yağış
    const yagisGelecek7Gun = await getForecastRainfallNext7Days(ilId);

    // Yağış miktarına göre risk artışını hesapla
    // 24 saatlik yağış daha kritik, 7 günlük yağış ve gelecek hafta tahmini de dikkate alınır
    const riskArtisi24Saat = calculateFloodRiskIncrease(yagis24Saat);
    const riskArtisi7Gun = calculateFloodRiskIncrease(yagis7Gun / 7); // Günlük ortalaması
    const riskArtisiGelecek7Gun = calculateFloodRiskIncrease(yagisGelecek7Gun / 7); // Gelecek hafta günlük ortalaması

    // En yüksek risk artışını kullan (gelecek hafta tahmini de dahil)
    const toplamRiskArtisi = Math.max(riskArtisi24Saat, riskArtisi7Gun, riskArtisiGelecek7Gun);

    // Yeni sel riski skorunu hesapla (maksimum 100 olacak şekilde)
    const yeniSelRiski = Math.min(100, baseSelRiski + toplamRiskArtisi);

    // Eğer yağış yoksa veya çok azsa, mevcut skoru koru (sadece biraz azalt)
    if (yagis24Saat < 1 && yagis7Gun < 5) {
      // Normal koşullarda risk yavaşça azalır (maksimum %10 azalış)
      const azalis = Math.min(baseSelRiski * 0.1, 5);
      const finalSelRiski = Math.max(0, baseSelRiski - azalis);
      
      await RiskScoreModel.updateSelRiski(ilId, finalSelRiski);
      
      return {
        ilAdi,
        mevcutSelRiski: baseSelRiski.toFixed(2),
        yeniSelRiski: finalSelRiski.toFixed(2),
        yagis24Saat: yagis24Saat.toFixed(2),
        yagis7Gun: yagis7Gun.toFixed(2),
        yagisGelecek7Gun: yagisGelecek7Gun.toFixed(2),
        riskArtisi: -azalis.toFixed(2),
        durum: 'normal'
      };
    }

    // Risk skorunu güncelle
    await RiskScoreModel.updateSelRiski(ilId, yeniSelRiski);

    return {
      ilAdi,
      mevcutSelRiski: baseSelRiski.toFixed(2),
      yeniSelRiski: yeniSelRiski.toFixed(2),
      yagis24Saat: yagis24Saat.toFixed(2),
      yagis7Gun: yagis7Gun.toFixed(2),
      yagisGelecek7Gun: yagisGelecek7Gun.toFixed(2),
      riskArtisi: toplamRiskArtisi.toFixed(2),
      durum: toplamRiskArtisi > 20 ? 'kritik' : toplamRiskArtisi > 10 ? 'yuksek' : 'orta'
    };
  } catch (error) {
    console.error(`${ilAdi} için sel riski hesaplanırken hata:`, error.message);
    return {
      ilAdi,
      hata: error.message
    };
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🌊 Sel Riski Analizi Scripti\n');

  try {
    // Tüm Marmara illerini al
    const [provinces] = await pool.query(
      'SELECT id, il_adi FROM iller WHERE bolge = "Marmara" ORDER BY il_adi'
    );

    if (provinces.length === 0) {
      console.log('⚠️  Marmara bölgesi illeri bulunamadı!');
      return;
    }

    console.log(`📊 ${provinces.length} il için sel riski analizi yapılıyor...\n`);

    const results = [];
    let updated = 0;
    let errors = 0;

    for (const province of provinces) {
      const result = await calculateAndUpdateFloodRisk(province.id, province.il_adi);
      results.push(result);

      if (result.hata) {
        errors++;
        console.log(`❌ ${result.ilAdi}: ${result.hata}`);
      } else {
        updated++;
        const riskDurum = result.durum === 'kritik' ? '🔴 KRİTİK' :
                          result.durum === 'yuksek' ? '🟠 YÜKSEK' :
                          result.durum === 'orta' ? '🟡 ORTA' : '🟢 NORMAL';
        
        console.log(`✅ ${result.ilAdi}:`);
        console.log(`   Mevcut Sel Riski: ${result.mevcutSelRiski}`);
        console.log(`   Yeni Sel Riski: ${result.yeniSelRiski}`);
        console.log(`   Yağış (24 saat): ${result.yagis24Saat} mm`);
        console.log(`   Yağış (7 gün): ${result.yagis7Gun} mm`);
        console.log(`   Risk Artışı: ${result.riskArtisi > 0 ? '+' : ''}${result.riskArtisi}`);
        console.log(`   Durum: ${riskDurum}\n`);
      }
    }

    console.log('\n📊 Özet:');
    console.log(`   ✅ Güncellenen: ${updated}`);
    console.log(`   ❌ Hatalar: ${errors}`);

    // Kritik risk durumunda olan illeri listele
    const kritikIller = results.filter(r => r.durum === 'kritik');
    if (kritikIller.length > 0) {
      console.log(`\n⚠️  KRİTİK SEL RİSKİ OLAN İLLER:`);
      kritikIller.forEach(il => {
        console.log(`   🔴 ${il.ilAdi}: ${il.yeniSelRiski} (Yağış: ${il.yagis24Saat} mm / 24 saat)`);
      });
    }

    console.log('\n✅ Script tamamlandı');
  } catch (error) {
    console.error('\n❌ Hata:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Script çalıştırma
if (require.main === module) {
  main();
}

module.exports = {
  calculateFloodRiskIncrease,
  getTotalRainfallLast24Hours,
  getTotalRainfallLast7Days,
  getForecastRainfallNext7Days,
  calculateAndUpdateFloodRisk
};

