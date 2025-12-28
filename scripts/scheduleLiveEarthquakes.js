/**
 * Canlı Deprem Verilerini Otomatik Çekme Scheduler
 * 
 * Bu script belirli aralıklarla canlı deprem verilerini çeker
 * 
 * Kullanım:
 *   node scripts/scheduleLiveEarthquakes.js
 * 
 * Her 5 dakikada bir otomatik olarak çalışır
 */

const { fetchFromKandilli, fetchFromAFAD, saveEarthquakes } = require('./fetchLiveEarthquakes');
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
  console.log(`\n🕐 [${new Date().toLocaleString('tr-TR')}] Canlı deprem verileri kontrol ediliyor...`);
  
  try {
    // AFAD'dan veri çek (öncelikli)
    let afadData = [];
    try {
      console.log('   📡 AFAD\'dan veri çekiliyor...');
      afadData = await fetchFromAFAD();
      console.log(`   ✅ AFAD: ${afadData.length} deprem verisi bulundu`);
    } catch (error) {
      console.log(`   ⚠️  AFAD'dan veri çekilemedi: ${error.message}`);
    }
    
    // Kandilli'den veri çek (yedek)
    let kandilliData = [];
    try {
      console.log('   📡 Kandilli Rasathanesi\'nden veri çekiliyor...');
      kandilliData = await fetchFromKandilli();
      console.log(`   ✅ Kandilli: ${kandilliData.length} deprem verisi bulundu`);
    } catch (error) {
      console.log(`   ⚠️  Kandilli'den veri çekilemedi: ${error.message}`);
    }
    
    // Tüm verileri birleştir
    const allEarthquakes = [...afadData, ...kandilliData];
    
    if (allEarthquakes.length > 0) {
      await saveEarthquakes(allEarthquakes);
      console.log(`   ✅ Toplam ${allEarthquakes.length} deprem verisi işlendi`);
    } else {
      console.log('   ℹ️  Yeni deprem verisi yok');
    }
  } catch (error) {
    console.error('   ❌ Hata:', error.message);
  }
}

// Ana fonksiyon
async function main() {
  console.log('🚀 Canlı Deprem Verileri Otomatik Çekme Sistemi');
  console.log('⏰ Her 5 dakikada bir kontrol edilecek\n');
  
  await loadProvinceIds();
  
  // İlk çalıştırma
  await run();
  
  // Her 5 dakikada bir çalıştır (5 * 60 * 1000 ms)
  const interval = 5 * 60 * 1000;
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




