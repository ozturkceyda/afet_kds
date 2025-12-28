/**
 * İlçeler Verisi Yükleme Scripti
 * 
 * Bu script ilçe verilerini veritabanına yükler
 * Verileri CSV veya Excel formatında hazırlayıp bu script'e ekleyin
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
 * İlçe Verileri
 * 
 * Format: { il_adi: [{ ilce_adi, enlem, boylam, nufus }, ...] }
 * 
 * NOT: Bu verileri TÜİK veya Wikipedia'dan toplayın
 * Koordinatları Google Maps'ten alın
 * Nüfus verilerini TÜİK'ten alın
 */
const districtsData = {
  // İlçe verilerinizi buraya ekleyin
  // Örnek format:
  /*
  'İstanbul': [
    { ilce_adi: 'Kadıköy', enlem: 40.9819, boylam: 29.0244, nufus: 482571 },
    { ilce_adi: 'Beşiktaş', enlem: 41.0431, boylam: 29.0094, nufus: 191513 },
    // ... diğer ilçeler
  ],
  'Bursa': [
    { ilce_adi: 'Osmangazi', enlem: 40.1885, boylam: 29.0610, nufus: 882000 },
    // ... diğer ilçeler
  ]
  */
};

/**
 * İlçeleri veritabanına yükle
 */
async function loadDistricts() {
  try {
    console.log('📊 İlçeler yükleniyor...\n');
    
    // Önce tüm illeri al
    const [provinces] = await db.query('SELECT id, il_adi FROM iller ORDER BY il_adi');
    
    if (provinces.length === 0) {
      console.log('⚠️  Veritabanında il bulunamadı! Önce illeri yükleyin.');
      return;
    }
    
    let totalAdded = 0;
    let totalSkipped = 0;
    
    for (const province of provinces) {
      const districts = districtsData[province.il_adi];
      
      if (!districts || districts.length === 0) {
        console.log(`⚠️  ${province.il_adi} için ilçe verisi bulunamadı`);
        continue;
      }
      
      console.log(`\n📍 ${province.il_adi} (${districts.length} ilçe):`);
      
      for (const district of districts) {
        // Önce var mı kontrol et
        const [existing] = await db.query(
          'SELECT id FROM ilceler WHERE il_id = ? AND ilce_adi = ?',
          [province.id, district.ilce_adi]
        );

        if (existing.length === 0) {
          await db.query(
            'INSERT INTO ilceler (il_id, ilce_adi, enlem, boylam, nufus) VALUES (?, ?, ?, ?, ?)',
            [
              province.id,
              district.ilce_adi,
              district.enlem || null,
              district.boylam || null,
              district.nufus || null
            ]
          );
          console.log(`  ✅ ${district.ilce_adi} eklendi`);
          totalAdded++;
        } else {
          // Güncelleme (nüfus değişmiş olabilir)
          await db.query(
            'UPDATE ilceler SET enlem = ?, boylam = ?, nufus = ? WHERE il_id = ? AND ilce_adi = ?',
            [
              district.enlem || null,
              district.boylam || null,
              district.nufus || null,
              province.id,
              district.ilce_adi
            ]
          );
          console.log(`  🔄 ${district.ilce_adi} güncellendi`);
          totalSkipped++;
        }
      }
    }
    
    console.log(`\n📈 Özet:`);
    console.log(`   ✅ Eklenen: ${totalAdded} ilçe`);
    console.log(`   🔄 Güncellenen: ${totalSkipped} ilçe`);
    
    // Toplam ilçe sayısı
    const [count] = await db.query('SELECT COUNT(*) as total FROM ilceler');
    console.log(`   📊 Toplam ilçe sayısı: ${count[0].total}`);
    
  } catch (error) {
    console.error('❌ İlçeler yüklenirken hata:', error.message);
    throw error;
  }
}

/**
 * CSV formatından veri oku (gelecekte eklenebilir)
 */
function parseCSV(csvText) {
  // CSV parsing implementasyonu buraya eklenebilir
  // Şimdilik manuel veri girişi kullanılıyor
}

/**
 * Ana fonksiyon
 */
async function main() {
  try {
    console.log('🚀 İlçeler Yükleme Scripti\n');
    console.log('⚠️  ÖNEMLİ: districtsData objesine gerçek verileri ekleyin!');
    console.log('📚 Veri Kaynakları:');
    console.log('   - Wikipedia: https://tr.wikipedia.org/wiki/[İl_Adı]');
    console.log('   - TÜİK: https://www.tuik.gov.tr/');
    console.log('   - Google Maps (koordinatlar için)\n');
    
    if (Object.keys(districtsData).length === 0) {
      console.log('❌ districtsData objesi boş!');
      console.log('📝 Lütfen ilçe verilerini districtsData objesine ekleyin.\n');
      console.log('Örnek format:');
      console.log(`districtsData = {
  'İstanbul': [
    { ilce_adi: 'Kadıköy', enlem: 40.9819, boylam: 29.0244, nufus: 482571 }
  ]
};`);
      return;
    }
    
    await loadDistricts();
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

module.exports = { loadDistricts };




















