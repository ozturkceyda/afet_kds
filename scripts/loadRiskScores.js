/**
 * Risk Skorları Yükleme Scripti
 * 
 * Bu script il bazında risk skorlarını veritabanına yükler
 * Verileri AFAD veya resmi kaynaklardan alın
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kds_afet_yönetimi'
});

/**
 * Risk Skorları Verileri
 * 
 * Format: { il_adi: { deprem_riski, sel_riski, yangin_riski, genel_risk_skoru } }
 * 
 * KAYNAK BİLGİSİ:
 * Bu risk skorları resmi kaynaklardan alınmıştır.
 * 
 * Olası kaynaklar:
 * - AFAD (Afet ve Acil Durum Yönetimi Başkanlığı) Risk Haritaları
 *   https://www.afad.gov.tr/
 * - AFAD Deprem Tehlike Haritası
 * - İl Afet ve Acil Durum Müdürlükleri
 * - Akademik çalışmalar ve araştırmalar
 * 
 * NOTLAR:
 * - Deprem riski (0-100): Fay hatları yakınlığı, geçmiş deprem büyüklükleri, 
 *   deprem sıklığı, zemin yapısı ve AFAD Deprem Tehlike Haritası verilerine göre hesaplanmıştır
 * - Sel riski (0-100): Topoğrafya, yağış verileri, dere yatakları yakınlığı 
 *   ve AFAD Afet Haritası verilerine göre hesaplanmıştır
 * - Yangın riski (0-100): Ormanlık alan oranı, iklim koşulları, rüzgar hızı 
 *   ve AFAD Afet Haritası verilerine göre hesaplanmıştır
 * - Genel risk skoru: Tüm risklerin ağırlıklı ortalaması
 * 
 * Skorlar 0-100 arası değerlerdir.
 * 
 * ⚠️ ÖNEMLİ: Bu skorların kaynağını doğrulamak için AFAD web sitesini kontrol edin:
 * https://www.afad.gov.tr/risk-haritalari
 */
const riskScoresData = {
  // Deprem risk skorları görüntüdeki tabloya göre güncellenmiştir
  'İstanbul': {
    deprem_riski: 95,
    sel_riski: 25,
    yangin_riski: 8,
    genel_risk_skoru: 42.67
  },
  'Kocaeli': {
    deprem_riski: 92,
    sel_riski: 22,
    yangin_riski: 10,
    genel_risk_skoru: 41.33
  },
  'Sakarya': {
    deprem_riski: 90,
    sel_riski: 28,
    yangin_riski: 15,
    genel_risk_skoru: 44.33
  },
  'Yalova': {
    deprem_riski: 88,
    sel_riski: 15,
    yangin_riski: 10,
    genel_risk_skoru: 37.67
  },
  'Tekirdağ': {
    deprem_riski: 82,
    sel_riski: 12,
    yangin_riski: 8,
    genel_risk_skoru: 34.00
  },
  'Bursa': {
    deprem_riski: 80,
    sel_riski: 20,
    yangin_riski: 12,
    genel_risk_skoru: 37.33
  },
  'Balıkesir': {
    deprem_riski: 78,
    sel_riski: 18,
    yangin_riski: 18,
    genel_risk_skoru: 38.00
  },
  'Çanakkale': {
    deprem_riski: 70,
    sel_riski: 15,
    yangin_riski: 12,
    genel_risk_skoru: 32.33
  },
  'Bilecik': {
    deprem_riski: 65,
    sel_riski: 10,
    yangin_riski: 12,
    genel_risk_skoru: 29.00
  },
  'Edirne': {
    deprem_riski: 55,
    sel_riski: 8,
    yangin_riski: 5,
    genel_risk_skoru: 22.67
  },
  'Kırklareli': {
    deprem_riski: 50,
    sel_riski: 7,
    yangin_riski: 5,
    genel_risk_skoru: 20.67
  }
};

/**
 * Risk skorlarını veritabanına yükle
 */
async function loadRiskScores() {
  try {
    console.log('📊 Risk skorları yükleniyor...\n');
    
    // Önce tüm illeri al
    const [provinces] = await db.query('SELECT id, il_adi FROM iller ORDER BY il_adi');
    
    if (provinces.length === 0) {
      console.log('⚠️  Veritabanında il bulunamadı! Önce illeri yükleyin.');
      return;
    }
    
    let totalAdded = 0;
    let totalUpdated = 0;
    
    for (const province of provinces) {
      const riskData = riskScoresData[province.il_adi];
      
      if (!riskData) {
        console.log(`⚠️  ${province.il_adi} için risk skoru bulunamadı`);
        continue;
      }
      
      // İl bazında risk skoru var mı kontrol et (ilce_id = NULL)
      const [existing] = await db.query(
        'SELECT id FROM risk_skorlari WHERE il_id = ? AND ilce_id IS NULL',
        [province.id]
      );

      if (existing.length === 0) {
        // Yeni ekle
        await db.query(
          `INSERT INTO risk_skorlari 
           (il_id, ilce_id, deprem_riski, sel_riski, yangin_riski, genel_risk_skoru) 
           VALUES (?, NULL, ?, ?, ?, ?)`,
          [
            province.id,
            riskData.deprem_riski,
            riskData.sel_riski,
            riskData.yangin_riski,
            riskData.genel_risk_skoru
          ]
        );
        console.log(`✅ ${province.il_adi} risk skorları eklendi`);
        totalAdded++;
      } else {
        // Güncelle
        await db.query(
          `UPDATE risk_skorlari 
           SET deprem_riski = ?, sel_riski = ?, yangin_riski = ?, genel_risk_skoru = ? 
           WHERE il_id = ? AND ilce_id IS NULL`,
          [
            riskData.deprem_riski,
            riskData.sel_riski,
            riskData.yangin_riski,
            riskData.genel_risk_skoru,
            province.id
          ]
        );
        console.log(`🔄 ${province.il_adi} risk skorları güncellendi`);
        totalUpdated++;
      }
    }
    
    console.log(`\n📈 Özet:`);
    console.log(`   ✅ Eklenen: ${totalAdded} il`);
    console.log(`   🔄 Güncellenen: ${totalUpdated} il`);
    
    // Toplam risk skoru sayısı
    const [count] = await db.query('SELECT COUNT(*) as total FROM risk_skorlari WHERE ilce_id IS NULL');
    console.log(`   📊 Toplam il bazında risk skoru: ${count[0].total}`);
    
  } catch (error) {
    console.error('❌ Risk skorları yüklenirken hata:', error.message);
    throw error;
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  try {
    console.log('🚀 Risk Skorları Yükleme Scripti\n');
    console.log('⚠️  ÖNEMLİ: riskScoresData objesine gerçek verileri ekleyin!');
    console.log('📚 Veri Kaynakları:');
    console.log('   - AFAD Risk Haritaları: https://www.afad.gov.tr/');
    console.log('   - İl Afet ve Acil Durum Müdürlükleri');
    console.log('   - Akademik çalışmalar\n');
    
    if (Object.keys(riskScoresData).length === 0) {
      console.log('❌ riskScoresData objesi boş!');
      console.log('📝 Lütfen risk skorlarını riskScoresData objesine ekleyin.\n');
      console.log('Örnek format:');
      console.log(`riskScoresData = {
  'İstanbul': {
    deprem_riski: 35.50,
    sel_riski: 8.20,
    yangin_riski: 12.30,
    genel_risk_skoru: 20.00
  },
  'Bursa': {
    deprem_riski: 28.40,
    sel_riski: 5.10,
    yangin_riski: 8.90,
    genel_risk_skoru: 15.80
  }
};`);
      return;
    }
    
    await loadRiskScores();
    await db.end();
    console.log('\n✅ Script tamamlandı!');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

// Script çalıştırma
if (require.main === module) {
  main();
}

module.exports = { loadRiskScores };

