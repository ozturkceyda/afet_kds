require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

// AFAD verilerini otomatik çekme (opsiyonel - environment variable ile kontrol edilebilir)
if (process.env.AUTO_FETCH_EARTHQUAKES !== 'false') {
  // Scheduler'ı başlat (her 5 dakikada bir)
  const { fetchFromKandilli, fetchFromAFAD, saveEarthquakes } = require('./scripts/fetchLiveEarthquakes');
  
  let isRunning = false;
  
  async function fetchEarthquakes() {
    if (isRunning) {
      console.log('⏳ Deprem verisi çekme işlemi zaten devam ediyor...');
      return;
    }
    
    isRunning = true;
    try {
      console.log(`\n🕐 [${new Date().toLocaleString('tr-TR')}] AFAD deprem verileri çekiliyor...`);
      
      // AFAD'dan veri çek (öncelikli)
      let afadData = [];
      try {
        afadData = await fetchFromAFAD();
        console.log(`   ✅ AFAD: ${afadData.length} deprem verisi bulundu`);
      } catch (error) {
        console.log(`   ⚠️  AFAD'dan veri çekilemedi: ${error.message}`);
      }
      
      // Kandilli'den veri çek (yedek)
      let kandilliData = [];
      try {
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
    } finally {
      isRunning = false;
    }
  }
  
  // İlk çalıştırma (sunucu başladığında hemen)
  setTimeout(() => {
    fetchEarthquakes();
  }, 5000); // 5 saniye bekle (veritabanı bağlantısı hazır olsun)
  
  // Her 5 dakikada bir çalıştır
  setInterval(fetchEarthquakes, 5 * 60 * 1000);
  
  console.log('📡 AFAD deprem verileri otomatik çekme sistemi başlatıldı (her 5 dakikada bir)');
}

app.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
});




