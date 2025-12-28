/**
 * Hava Durumu Verileri Yükleme Scripti
 * 
 * Bu script 11 Marmara ili için örnek hava durumu verileri oluşturur.
 * Gerçek verileri MGM'den almak için fetchWeatherData.js scriptini kullanın.
 * 
 * Kullanım:
 *   node scripts/loadWeatherData.js
 */

const pool = require('../config/database');

// Marmara bölgesi illeri
const marmaraIlleri = [
  'İstanbul',
  'Bursa',
  'Kocaeli',
  'Sakarya',
  'Balıkesir',
  'Çanakkale',
  'Tekirdağ',
  'Yalova',
  'Bilecik',
  'Edirne',
  'Kırklareli'
];

/**
 * İl ID'lerini yükle
 */
async function loadProvinceIds() {
  try {
    const [rows] = await pool.query('SELECT id, il_adi FROM iller WHERE bolge = "Marmara"');
    const provinceMap = {};
    rows.forEach(row => {
      provinceMap[row.il_adi] = row.id;
    });
    return provinceMap;
  } catch (error) {
    console.error('❌ İl ID\'leri yüklenirken hata:', error.message);
    throw error;
  }
}

/**
 * Mevsim bazlı ortalama sıcaklık ve hava durumu hesapla
 */
function getSeasonalWeather(ilAdi, date = new Date()) {
  const month = date.getMonth() + 1; // 1-12
  const hour = date.getHours(); // 0-23
  
  // Her il için mevsimsel bazlı ortalama değerler (gerçekçi aralıklar)
  const cityBaseline = {
    'İstanbul': { baseTemp: 14, baseHumidity: 70, baseWind: 15, basePressure: 1013 },
    'Bursa': { baseTemp: 15, baseHumidity: 68, baseWind: 12, basePressure: 1014 },
    'Kocaeli': { baseTemp: 14, baseHumidity: 72, baseWind: 16, basePressure: 1013 },
    'Sakarya': { baseTemp: 14, baseHumidity: 71, baseWind: 14, basePressure: 1014 },
    'Balıkesir': { baseTemp: 15, baseHumidity: 65, baseWind: 18, basePressure: 1015 },
    'Çanakkale': { baseTemp: 15, baseHumidity: 67, baseWind: 22, basePressure: 1015 },
    'Tekirdağ': { baseTemp: 13, baseHumidity: 73, baseWind: 20, basePressure: 1013 },
    'Yalova': { baseTemp: 15, baseHumidity: 70, baseWind: 15, basePressure: 1014 },
    'Bilecik': { baseTemp: 13, baseHumidity: 69, baseWind: 10, basePressure: 1014 },
    'Edirne': { baseTemp: 13, baseHumidity: 71, baseWind: 16, basePressure: 1013 },
    'Kırklareli': { baseTemp: 12, baseHumidity: 72, baseWind: 18, basePressure: 1013 }
  };

  const baseline = cityBaseline[ilAdi] || cityBaseline['İstanbul'];
  
  // Mevsimsel sıcaklık değişimi (Aralık ayı için kış değerleri)
  let tempAdjustment = 0;
  let seasonCondition = 'Parçalı Bulutlu';
  
  if (month >= 12 || month <= 2) {
    // Kış (Aralık, Ocak, Şubat)
    tempAdjustment = -5;
    seasonCondition = Math.random() > 0.7 ? 'Yağmurlu' : 'Parçalı Bulutlu';
  } else if (month >= 3 && month <= 5) {
    // İlkbahar
    tempAdjustment = 3;
    seasonCondition = 'Parçalı Bulutlu';
  } else if (month >= 6 && month <= 8) {
    // Yaz
    tempAdjustment = 12;
    seasonCondition = 'Açık';
  } else {
    // Sonbahar
    tempAdjustment = 5;
    seasonCondition = Math.random() > 0.8 ? 'Yağmurlu' : 'Parçalı Bulutlu';
  }
  
  // Günlük sıcaklık değişimi (sabah soğuk, öğle sıcak)
  let dailyAdjustment = 0;
  if (hour >= 6 && hour <= 10) {
    dailyAdjustment = -2; // Sabah
  } else if (hour >= 11 && hour <= 15) {
    dailyAdjustment = 3; // Öğle
  } else if (hour >= 16 && hour <= 20) {
    dailyAdjustment = 1; // Akşam
  } else {
    dailyAdjustment = -3; // Gece
  }
  
  // Rastgele değişkenlik ekle (±2°C, ±5% nem, ±2 km/s rüzgar)
  const temp = baseline.baseTemp + tempAdjustment + dailyAdjustment + (Math.random() * 4 - 2);
  const humidity = baseline.baseHumidity + (Math.random() * 10 - 5);
  const windSpeed = Math.max(0, baseline.baseWind + (Math.random() * 4 - 2));
  const pressure = baseline.basePressure + (Math.random() * 4 - 2);
  
  // Yağış (kış aylarında daha yüksek olasılık)
  let rainfall = 0;
  if (month >= 12 || month <= 2) {
    if (Math.random() > 0.6) {
      rainfall = Math.random() * 5; // 0-5 mm
      seasonCondition = 'Yağmurlu';
    }
  } else if (month >= 9 && month <= 11) {
    if (Math.random() > 0.8) {
      rainfall = Math.random() * 3; // 0-3 mm
      seasonCondition = 'Yağmurlu';
    }
  }
  
  // Hava durumu koşulları
  const conditions = ['Açık', 'Parçalı Bulutlu', 'Bulutlu', 'Yağmurlu', 'Az Bulutlu'];
  if (rainfall > 0) {
    seasonCondition = 'Yağmurlu';
  } else if (Math.random() > 0.7) {
    seasonCondition = conditions[Math.floor(Math.random() * conditions.length)];
  }
  
  return {
    sicaklik: parseFloat(temp.toFixed(2)),
    nem: Math.round(humidity),
    ruzgar_hizi: parseFloat(windSpeed.toFixed(2)),
    yagis_miktari: parseFloat(rainfall.toFixed(2)),
    hava_durumu: seasonCondition,
    basinc: parseFloat(pressure.toFixed(2))
  };
}

/**
 * Hava durumu verilerini veritabanına kaydet
 */
async function saveWeatherData(ilId, weatherData, tarihSaat) {
  try {
    // Duplicate kontrolü: Aynı il ve tarih-saatte kayıt var mı?
    const [existing] = await pool.query(
      `SELECT id FROM hava_durumu_canli 
       WHERE il_id = ? 
       AND tarih_saat = ?`,
      [ilId, tarihSaat]
    );
    
    if (existing.length > 0) {
      return { saved: false, reason: 'duplicate' };
    }
    
    // Yeni hava durumu kaydı ekle
    await pool.query(
      `INSERT INTO hava_durumu_canli 
       (il_id, ilce_id, sicaklik, nem, ruzgar_hizi, yagis_miktari, hava_durumu, basinc, tarih_saat) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ilId,
        null, // ilce_id şimdilik null
        weatherData.sicaklik,
        weatherData.nem,
        weatherData.ruzgar_hizi,
        weatherData.yagis_miktari,
        weatherData.hava_durumu,
        weatherData.basinc,
        tarihSaat
      ]
    );
    
    return { saved: true };
  } catch (error) {
    console.error(`❌ Hava durumu kaydedilirken hata (il_id: ${ilId}):`, error.message);
    return { saved: false, reason: 'error', error: error.message };
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🌤️  Hava Durumu Verileri Yükleme Scripti\n');
  
  try {
    // İl ID'lerini yükle
    console.log('📋 İl ID\'leri yükleniyor...');
    const provinceMap = await loadProvinceIds();
    console.log(`✅ ${Object.keys(provinceMap).length} il ID'si yüklendi\n`);
    
    // Her il için son 7 günün verilerini oluştur
    const now = new Date();
    let totalSaved = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    console.log('📊 Hava durumu verileri oluşturuluyor...\n');
    
    for (const ilAdi of marmaraIlleri) {
      const ilId = provinceMap[ilAdi];
      
      if (!ilId) {
        console.log(`⚠️  ${ilAdi} için il ID bulunamadı, atlanıyor`);
        continue;
      }
      
      let ilSaved = 0;
      let ilSkipped = 0;
      
      // Son 7 gün için günlük veriler (her gün 3 saatlik aralıklarla: 06:00, 12:00, 18:00)
      for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
        const date = new Date(now);
        date.setDate(date.getDate() - dayOffset);
        
        // Her gün 3 ölçüm saati
        const hours = [6, 12, 18];
        
        for (const hour of hours) {
          date.setHours(hour, 0, 0, 0);
          const tarihSaat = date.toISOString().slice(0, 19).replace('T', ' ');
          
          // Hava durumu verilerini oluştur
          const weatherData = getSeasonalWeather(ilAdi, date);
          
          // Veritabanına kaydet
          const result = await saveWeatherData(ilId, weatherData, tarihSaat);
          
          if (result.saved) {
            ilSaved++;
            totalSaved++;
          } else if (result.reason === 'duplicate') {
            ilSkipped++;
            totalSkipped++;
          } else {
            totalErrors++;
          }
        }
      }
      
      console.log(`✅ ${ilAdi}: ${ilSaved} kayıt eklendi, ${ilSkipped} atlandı (duplicate)`);
    }
    
    console.log(`\n📊 Özet:`);
    console.log(`   ✅ Kaydedilen: ${totalSaved}`);
    console.log(`   ⏭️  Atlanan (duplicate): ${totalSkipped}`);
    console.log(`   ❌ Hatalar: ${totalErrors}`);
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

module.exports = { loadProvinceIds, getSeasonalWeather, saveWeatherData };

