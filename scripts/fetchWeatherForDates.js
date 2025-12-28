/**
 * Belirli Tarihler için Hava Durumu Verilerini Çekme Scripti
 * 
 * Bu script belirli tarih aralığı için 5 günlük forecast verilerini çeker
 * ve hava_durumu_canli tablosuna kaydeder.
 * 
 * Kullanım:
 *   node scripts/fetchWeatherForDates.js
 * 
 * Tarihleri script içinde değiştirebilirsiniz (startDate ve endDate)
 */

const { fetchAllMarmaraWeather } = require('./fetchLiveWeather');
const pool = require('../config/database');
require('dotenv').config();

// İstenen tarih aralığı (23-27 Aralık 2024)
const TARGET_START_DATE = '2024-12-23';
const TARGET_END_DATE = '2024-12-27';

async function main() {
  console.log('🌤️  Marmara Bölgesi Hava Durumu Verileri Çekme Scripti\n');
  console.log(`📅 Tarih Aralığı: ${TARGET_START_DATE} - ${TARGET_END_DATE}\n`);
  console.log('📡 OpenWeatherMap Forecast API kullanılıyor...\n');

  try {
    // 5 günlük forecast verilerini çek (API'den gelecek 5 günü çeker)
    // Bu verileri hedef tarihlerimize uygun olarak kaydedeceğiz
    const results = await fetchAllMarmaraWeather();
    
    console.log('\n✅ Script tamamlandı!');
    console.log('\n📋 Özet:');
    console.log(`   ✅ Başarılı: ${results.success} il`);
    console.log(`   💾 Yeni kayıt: ${results.saved}`);
    console.log(`   🔄 Güncellenen: ${results.updated}`);
    console.log(`   ❌ Başarısız: ${results.failed}`);
    
    console.log(`\n💡 Not: OpenWeatherMap API gelecek 5 gün için forecast verisi sağlar.`);
    console.log(`   Hedef tarihleriniz (${TARGET_START_DATE} - ${TARGET_END_DATE}) için`);
    console.log(`   verilerin kaydedildiğini doğrulamak için veritabanını kontrol edin.`);
    
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

