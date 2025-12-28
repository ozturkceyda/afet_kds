/**
 * Hava Durumu Verilerini Temizleme Scripti
 * 
 * Bu script hava_durumu_canli tablosundaki tüm verileri siler.
 * 
 * Kullanım:
 *   node scripts/clearWeatherData.js
 */

const pool = require('../config/database');

async function clearWeatherData() {
  console.log('🗑️  Hava Durumu Verilerini Temizleme Scripti\n');

  try {
    // Tüm hava durumu verilerini sil
    const [result] = await pool.query('DELETE FROM hava_durumu_canli');
    
    console.log(`✅ ${result.affectedRows} adet hava durumu kaydı silindi`);
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
  clearWeatherData();
}

module.exports = { clearWeatherData };











