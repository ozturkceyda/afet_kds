/**
 * Hava Durumu Tahmin (Forecast) Verilerini Çekme Scripti
 * 
 * Bu script 11 Marmara ili için 5 günlük hava durumu tahminlerini çeker
 * ve hava_durumu_canli tablosuna kaydeder.
 * 
 * Kullanım:
 *   node scripts/fetchWeatherForecast.js
 */

const { fetchForecastFromOpenWeatherMap, generateMockForecast, saveWeatherData } = require('./fetchLiveWeather');
const pool = require('../config/database');

// Marmara bölgesi illeri
const marmaraIlleri = {};

async function loadProvinceIds() {
  try {
    const [rows] = await pool.query('SELECT id, il_adi FROM iller WHERE bolge = "Marmara"');
    rows.forEach(row => {
      marmaraIlleri[row.il_adi] = row.id;
    });
    console.log('✅ İl ID\'leri yüklendi');
  } catch (error) {
    console.error('❌ İl ID\'leri yüklenirken hata:', error.message);
  }
}

async function main() {
  console.log('📅 Hava Durumu Tahmin (Forecast) Verileri Çekme Scripti\n');

  try {
    await loadProvinceIds();

    const forecastDataArray = [];
    const useAPI = process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY !== '';

    console.log(`📡 5 günlük hava durumu tahminleri çekiliyor...`);
    console.log(`   ${useAPI ? '🌐 OpenWeatherMap Forecast API kullanılıyor' : '⚠️  API key yok, örnek veri oluşturuluyor'}\n`);

    for (const [ilAdi, ilId] of Object.entries(marmaraIlleri)) {
      if (!ilId) continue;

      try {
        let forecasts;

        if (useAPI) {
          forecasts = await fetchForecastFromOpenWeatherMap(ilAdi, process.env.OPENWEATHER_API_KEY);
        } else {
          forecasts = generateMockForecast(ilAdi);
        }

        forecasts.forEach(forecast => {
          forecastDataArray.push({
            il_id: ilId,
            il_adi: ilAdi,
            ...forecast
          });
        });

        if (useAPI) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ ${ilAdi} için forecast çekilemedi: ${error.message}`);
      }
    }

    console.log(`   ${forecastDataArray.length} forecast kaydı oluşturuldu\n`);

    if (forecastDataArray.length > 0) {
      console.log(`💾 Veritabanına kaydediliyor...`);
      await saveWeatherData(forecastDataArray);
    }

    console.log('\n✅ Script tamamlandı');
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













