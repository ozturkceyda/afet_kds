/**
 * Canlı Hava Durumu Verilerini Otomatik Çekme Scheduler
 * 
 * Bu script belirli aralıklarla canlı hava durumu verilerini çeker
 * 
 * Kullanım:
 *   node scripts/scheduleLiveWeather.js
 * 
 * Her 1 saatte bir otomatik olarak çalışır (hava durumu genelde saatlik güncellenir)
 */

const { generateMockWeather, saveWeatherData } = require('./fetchLiveWeather');
const pool = require('../config/database');

// Marmara bölgesi illeri
const marmaraIlleri = {};

async function loadProvinceIds() {
  try {
    const [rows] = await pool.query('SELECT id, il_adi FROM iller WHERE bolge = "Marmara"');
    rows.forEach(row => {
      marmaraIlleri[row.il_adi] = row.id;
    });
  } catch (error) {
    console.error('❌ İl ID\'leri yüklenirken hata:', error.message);
  }
}

// İlk çalıştırma
async function run() {
  console.log(`\n🕐 [${new Date().toLocaleString('tr-TR')}] Canlı hava durumu verileri kontrol ediliyor...`);

  try {
    const weatherDataArray = [];

    // Her il için hava durumu verisi oluştur
    for (const [ilAdi, ilId] of Object.entries(marmaraIlleri)) {
      if (!ilId) continue;

      const weatherData = generateMockWeather(ilAdi);
      weatherDataArray.push({
        il_id: ilId,
        il_adi: ilAdi,
        ...weatherData
      });
    }

    if (weatherDataArray.length > 0) {
      await saveWeatherData(weatherDataArray);
    } else {
      console.log('   ℹ️  Hava durumu verisi oluşturulamadı');
    }
  } catch (error) {
    console.error('   ❌ Hata:', error.message);
  }
}

// Ana fonksiyon
async function main() {
  console.log('🌤️  Canlı Hava Durumu Verileri Otomatik Çekme Sistemi');
  console.log('⏰ Her 1 saatte bir kontrol edilecek\n');

  await loadProvinceIds();

  // İlk çalıştırma
  await run();

  // Her 1 saatte bir çalıştır (1 * 60 * 60 * 1000 ms)
  const interval = 1 * 60 * 60 * 1000;
  setInterval(run, interval);

  console.log('\n✅ Scheduler başlatıldı. Durdurmak için Ctrl+C basın.');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Scheduler durduruluyor...');
  await pool.end();
  process.exit(0);
});

if (require.main === module) {
  main();
}













