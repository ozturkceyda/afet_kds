/**
 * İller Tablosunu 2024 Nüfus Verileri ile Güncelleme Scripti
 * Kaynak: TÜİK 2024 Nüfus Verileri
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

// 2024 Nüfus Verileri
const nufusData2024 = {
  'Balıkesir': 1276096,
  'Bilecik': 228495,
  'Bursa': 3238618,
  'Çanakkale': 568966,
  'Edirne': 421247,
  'İstanbul': 15701602,
  'Kırklareli': 379031,
  'Kocaeli': 2130006,
  'Sakarya': 1110735,
  'Tekirdağ': 1187162,
  'Yalova': 307882
};

/**
 * İller tablosunu güncelle
 */
async function updateProvinces() {
  try {
    console.log('📊 İller tablosu 2024 nüfus verileri ile güncelleniyor...\n');
    
    let updated = 0;
    let notFound = 0;
    
    for (const [ilAdi, nufus] of Object.entries(nufusData2024)) {
      const [result] = await db.query(
        'UPDATE iller SET nufus = ? WHERE il_adi = ?',
        [nufus, ilAdi]
      );
      
      if (result.affectedRows > 0) {
        console.log(`✅ ${ilAdi}: ${nufus.toLocaleString('tr-TR')} nüfus ile güncellendi`);
        updated++;
      } else {
        console.log(`⚠️  ${ilAdi}: Veritabanında bulunamadı`);
        notFound++;
      }
    }
    
    console.log(`\n📈 Özet:`);
    console.log(`   ✅ Güncellenen: ${updated} il`);
    console.log(`   ⚠️  Bulunamayan: ${notFound} il`);
    
    // Güncelleme sonrası kontrol
    console.log('\n📋 Güncel veriler:');
    const [provinces] = await db.query(
      'SELECT il_adi, nufus FROM iller ORDER BY il_adi'
    );
    
    provinces.forEach(province => {
      console.log(`   ${province.il_adi}: ${province.nufus?.toLocaleString('tr-TR') || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ Güncelleme hatası:', error.message);
    throw error;
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  try {
    await updateProvinces();
    await db.end();
    console.log('\n✅ Güncelleme tamamlandı!');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

// Script çalıştırma
if (require.main === module) {
  main();
}

module.exports = { updateProvinces };




















