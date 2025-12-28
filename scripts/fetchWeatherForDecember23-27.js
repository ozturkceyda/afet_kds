/**
 * 23-27 Aralık 2025 için Marmara Bölgesi Hava Durumu Verilerini Çekme Scripti
 * 
 * Bu script OpenWeatherMap API kullanarak 11 Marmara ili için
 * 23-27 Aralık 2025 tarihleri için 5 günlük forecast verilerini çeker
 * ve hava_durumu_canli tablosuna kaydeder.
 * 
 * Kullanım:
 *   node scripts/fetchWeatherForDecember23-27.js
 */

const pool = require('../config/database');
const https = require('https');
require('dotenv').config();

// Marmara bölgesi illeri ve koordinatları
const marmaraProvinces = {
  'İstanbul': { lat: 41.0082, lon: 28.9784 },
  'Bursa': { lat: 40.1826, lon: 29.0665 },
  'Kocaeli': { lat: 40.8533, lon: 29.8815 },
  'Balıkesir': { lat: 39.6484, lon: 27.8826 },
  'Tekirdağ': { lat: 40.9833, lon: 27.5167 },
  'Çanakkale': { lat: 40.1553, lon: 26.4142 },
  'Edirne': { lat: 41.6772, lon: 26.5556 },
  'Kırklareli': { lat: 41.7333, lon: 27.2167 },
  'Bilecik': { lat: 40.1500, lon: 30.0000 },
  'Sakarya': { lat: 40.7833, lon: 30.4000 },
  'Yalova': { lat: 40.6500, lon: 29.2667 }
};

// Hedef tarihler (23-27 Aralık 2025)
const targetDates = [
  '2025-12-23',
  '2025-12-24',
  '2025-12-25',
  '2025-12-26',
  '2025-12-27'
];

/**
 * OpenWeatherMap API'den 5 günlük hava durumu tahmini çek
 */
function fetch5DayForecastFromAPI(lat, lon) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    
    if (!apiKey) {
      reject(new Error('OPENWEATHERMAP_API_KEY environment variable bulunamadı!'));
      return;
    }
    
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=tr`;
    
    https.get(url, (res) => {
      let data = '';
      
      if (res.statusCode !== 200) {
        res.on('data', () => {});
        res.on('end', () => {
          reject(new Error(`HTTP ${res.statusCode}: OpenWeatherMap API hatası`));
        });
        return;
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const forecastData = JSON.parse(data);
          resolve(forecastData);
        } catch (error) {
          reject(new Error(`JSON parse hatası: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Network hatası: ${error.message}`));
    });
  });
}

/**
 * Hava durumu durumunu Türkçe'ye çevir
 */
function translateWeatherCondition(main, description) {
  const translations = {
    'Clear': 'Açık',
    'Clouds': 'Bulutlu',
    'Rain': 'Yağmurlu',
    'Drizzle': 'Çiseleyen Yağmur',
    'Thunderstorm': 'Fırtına',
    'Snow': 'Karlı',
    'Mist': 'Sisli',
    'Fog': 'Sisli',
    'Haze': 'Puslu',
    'Dust': 'Tozlu',
    'Sand': 'Kumlu',
    'Ash': 'Kül',
    'Squall': 'Şiddetli Rüzgar',
    'Tornado': 'Tornado'
  };
  
  return translations[main] || main;
}

/**
 * İl ID'sini il adından bul
 */
async function getProvinceId(provinceName) {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM iller WHERE il_adi = ?',
      [provinceName]
    );
    return rows.length > 0 ? rows[0].id : null;
  } catch (error) {
    console.error(`İl ID bulunurken hata (${provinceName}):`, error.message);
    return null;
  }
}

/**
 * Forecast verilerini hedef tarihlere göre filtrele ve düzenle
 */
function filterForecastForTargetDates(forecastData, targetDates) {
  const forecasts = [];
  const dailyData = {};
  
  // API'den gelen verileri günlere göre grupla
  forecastData.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dateKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
    
    // Sadece hedef tarihleri dahil et
    if (!targetDates.includes(dateKey)) {
      return;
    }
    
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        temps: [],
        humidity: [],
        wind: [],
        rain: [],
        pressure: [],
        conditions: []
      };
    }
    
    const weatherCondition = translateWeatherCondition(item.weather[0].main, item.weather[0].description);
    
    dailyData[dateKey].temps.push(item.main.temp);
    dailyData[dateKey].humidity.push(item.main.humidity);
    dailyData[dateKey].wind.push(item.wind ? (item.wind.speed * 3.6) : 0); // m/s to km/h
    dailyData[dateKey].rain.push(item.rain ? (item.rain['3h'] || 0) : 0);
    dailyData[dateKey].pressure.push(item.main.pressure);
    dailyData[dateKey].conditions.push(weatherCondition);
  });
  
  // Her hedef gün için ortalama değerleri hesapla
  targetDates.forEach(dateKey => {
    if (!dailyData[dateKey]) {
      // Bu tarih için veri yoksa atla
      return;
    }
    
    const day = dailyData[dateKey];
    const avgTemp = day.temps.reduce((a, b) => a + b, 0) / day.temps.length;
    const avgHumidity = Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length);
    const avgWind = day.wind.reduce((a, b) => a + b, 0) / day.wind.length;
    const totalRain = day.rain.reduce((a, b) => a + b, 0);
    const avgPressure = day.pressure.reduce((a, b) => a + b, 0) / day.pressure.length;
    
    // En çok görülen hava durumu
    const conditionCounts = {};
    day.conditions.forEach(c => {
      conditionCounts[c] = (conditionCounts[c] || 0) + 1;
    });
    const mostCommonCondition = Object.keys(conditionCounts).reduce((a, b) => 
      conditionCounts[a] > conditionCounts[b] ? a : b
    );
    
    // Günün ortasındaki saati kullan (12:00)
    const midDate = new Date(dateKey + 'T12:00:00');
    
    forecasts.push({
      sicaklik: parseFloat(avgTemp.toFixed(2)),
      nem: avgHumidity,
      ruzgar_hizi: parseFloat(avgWind.toFixed(2)),
      yagis_miktari: parseFloat(totalRain.toFixed(2)),
      hava_durumu: mostCommonCondition,
      basinc: parseFloat(avgPressure.toFixed(2)),
      tarih_saat: midDate.toISOString().slice(0, 19).replace('T', ' ')
    });
  });
  
  return forecasts;
}

/**
 * Hava durumu verilerini veritabanına kaydet
 */
async function saveWeatherData(provinceId, weatherData) {
  try {
    // Duplicate kontrolü: Aynı il ve tarih için kayıt var mı?
    const [existing] = await pool.query(
      `SELECT id FROM hava_durumu_canli 
       WHERE il_id = ? 
       AND DATE(tarih_saat) = DATE(?)
       LIMIT 1`,
      [provinceId, weatherData.tarih_saat]
    );
    
    if (existing.length > 0) {
      // Mevcut kaydı güncelle
      await pool.query(
        `UPDATE hava_durumu_canli 
         SET sicaklik = ?, nem = ?, ruzgar_hizi = ?, yagis_miktari = ?, 
             hava_durumu = ?, basinc = ?, tarih_saat = ?
         WHERE id = ?`,
        [
          weatherData.sicaklik,
          weatherData.nem,
          weatherData.ruzgar_hizi,
          weatherData.yagis_miktari,
          weatherData.hava_durumu,
          weatherData.basinc,
          weatherData.tarih_saat,
          existing[0].id
        ]
      );
      return { saved: false, updated: true };
    } else {
      // Yeni kayıt ekle
      await pool.query(
        `INSERT INTO hava_durumu_canli 
         (il_id, sicaklik, nem, ruzgar_hizi, yagis_miktari, hava_durumu, basinc, tarih_saat) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          provinceId,
          weatherData.sicaklik,
          weatherData.nem,
          weatherData.ruzgar_hizi,
          weatherData.yagis_miktari,
          weatherData.hava_durumu,
          weatherData.basinc,
          weatherData.tarih_saat
        ]
      );
      return { saved: true, updated: false };
    }
  } catch (error) {
    throw new Error(`Veritabanı kayıt hatası: ${error.message}`);
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🌤️  23-27 Aralık 2025 Hava Durumu Verileri Çekme Scripti\n');
  console.log('📅 Hedef Tarihler: 23, 24, 25, 26, 27 Aralık 2025\n');
  console.log('📡 OpenWeatherMap API kullanılıyor...\n');

  const results = {
    success: 0,
    failed: 0,
    updated: 0,
    saved: 0,
    errors: []
  };

  for (const [provinceName, coords] of Object.entries(marmaraProvinces)) {
    try {
      console.log(`📡 ${provinceName} için hava durumu çekiliyor...`);
      
      // İl ID'sini bul
      const provinceId = await getProvinceId(provinceName);
      if (!provinceId) {
        console.log(`   ⚠️  ${provinceName} için il ID bulunamadı, atlanıyor...`);
        results.failed++;
        continue;
      }
      
      // API'den 5 günlük forecast verisi çek
      const forecastData = await fetch5DayForecastFromAPI(coords.lat, coords.lon);
      
      // Hedef tarihler için filtrele ve düzenle
      const forecasts = filterForecastForTargetDates(forecastData, targetDates);
      
      if (forecasts.length === 0) {
        console.log(`   ⚠️  ${provinceName} için hedef tarihler bulunamadı`);
        results.failed++;
        continue;
      }
      
      // Her gün için veritabanına kaydet
      for (const forecast of forecasts) {
        const saveResult = await saveWeatherData(provinceId, forecast);
        
        if (saveResult.saved) {
          results.saved++;
        } else if (saveResult.updated) {
          results.updated++;
        }
      }
      
      console.log(`   ✅ ${provinceName}: ${forecasts.length} günlük veri kaydedildi`);
      results.success++;
      
      // API rate limit için kısa bekleme (ücretsiz plan: 60 çağrı/dakika)
      await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 saniye bekle
      
    } catch (error) {
      console.error(`   ❌ ${provinceName} hatası: ${error.message}`);
      results.failed++;
      results.errors.push({ province: provinceName, error: error.message });
    }
  }
  
  console.log('\n📊 Özet:');
  console.log(`   ✅ Başarılı İller: ${results.success}`);
  console.log(`   💾 Yeni Kayıtlar: ${results.saved}`);
  console.log(`   🔄 Güncellenen: ${results.updated}`);
  console.log(`   ❌ Başarısız: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  Hatalar:');
    results.errors.forEach(err => {
      console.log(`   - ${err.province}: ${err.error}`);
    });
  }
  
  console.log('\n✅ Script tamamlandı!');
  console.log('💡 Dashboard\'da "Hava Durumu" bölümüne giderek verileri görüntüleyebilirsiniz.');
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Hata:', error.message);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { main };

