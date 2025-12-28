/**
 * Marmara Bölgesi için Gerçek Zamanlı Hava Durumu Verilerini Çekme Scripti
 * 
 * Bu script 11 Marmara ili için gerçek zamanlı (current) hava durumu verilerini çeker
 * ve hava_durumu_canli tablosuna kaydeder.
 * 
 * Kullanım:
 *   node scripts/fetchCurrentWeatherMarmara.js
 */

const { fetchAllMarmaraCurrentWeather } = require('./fetchLiveWeather');
const pool = require('../config/database');

async function main() {
  console.log('🌤️  Marmara Bölgesi Gerçek Zamanlı Hava Durumu Verileri\n');
  console.log('📡 OpenWeatherMap API kullanılıyor...\n');

  try {
    const results = await fetchAllMarmaraCurrentWeather();
    
    console.log('\n✅ Script tamamlandı!');
    console.log('\n📋 Özet:');
    console.log(`   ✅ Başarılı: ${results.success} il`);
    console.log(`   💾 Yeni kayıt: ${results.saved}`);
    console.log(`   🔄 Güncellenen: ${results.updated}`);
    console.log(`   ❌ Başarısız: ${results.failed}`);
    
    if (results.data.length > 0) {
      console.log('\n📊 Çekilen Veriler:');
      results.data.forEach(item => {
        console.log(`   ${item.il_adi}: ${item.sicaklik}°C, ${item.hava_durumu}, ${item.nem}% nem`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Hata:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

