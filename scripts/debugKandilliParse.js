/**
 * Kandilli parse işlemini detaylı debug et
 */

require('dotenv').config();
const { fetchFromKandilli } = require('./fetchLiveEarthquakes');
const pool = require('../config/database');

async function debugParse() {
  try {
    console.log('📡 Kandilli\'den veri çekiliyor...\n');
    const earthquakes = await fetchFromKandilli();
    
    console.log(`✅ Toplam ${earthquakes.length} deprem parse edildi\n`);
    
    // İl bazında grupla
    const ilCounts = {};
    const ilDetails = {};
    
    // İl ID'lerini önce yükle
    const [ilRows] = await pool.query('SELECT id, il_adi FROM iller');
    const ilMap = {};
    ilRows.forEach(row => {
      ilMap[row.id] = row.il_adi;
    });
    
    for (const eq of earthquakes) {
      const ilAdi = ilMap[eq.il_id] || 'Bilinmiyor';
      
      ilCounts[ilAdi] = (ilCounts[ilAdi] || 0) + 1;
      
      if (!ilDetails[ilAdi]) {
        ilDetails[ilAdi] = [];
      }
      ilDetails[ilAdi].push({
        buyukluk: eq.buyukluk,
        tarih: eq.tarih_saat,
        enlem: eq.enlem,
        boylam: eq.boylam
      });
    }
    
    console.log('📋 İl bazında dağılım:');
    Object.entries(ilCounts).sort((a, b) => b[1] - a[1]).forEach(([il, count]) => {
      console.log(`\n  ${il}: ${count} deprem`);
      // İlk 3 depremi göster
      ilDetails[il].slice(0, 3).forEach((eq, i) => {
        console.log(`    ${i + 1}. ${eq.buyukluk} büyüklüğünde - ${eq.tarih} - (${eq.enlem}, ${eq.boylam})`);
      });
    });
    
    // En son parse edilen 10 deprem
    console.log('\n\n📊 En son parse edilen 10 deprem:');
    earthquakes.slice(0, 10).forEach((eq, i) => {
      const ilAdi = ilMap[eq.il_id] || 'Bilinmiyor';
      console.log(`${i + 1}. ${ilAdi} - ${eq.buyukluk} büyüklüğünde - ${eq.tarih_saat}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugParse();

