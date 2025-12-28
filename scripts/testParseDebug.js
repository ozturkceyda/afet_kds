/**
 * Parse işlemini debug et
 */

require('dotenv').config();
const { fetchFromKandilli } = require('./fetchLiveEarthquakes');
const pool = require('../config/database');

async function testParse() {
  try {
    console.log('📡 Kandilli\'den veri çekiliyor...\n');
    const earthquakes = await fetchFromKandilli();
    
    console.log(`\n✅ Toplam ${earthquakes.length} deprem parse edildi\n`);
    
    // İl bazında grupla
    const ilCounts = {};
    earthquakes.forEach(eq => {
      // İl adını bul
      pool.query('SELECT il_adi FROM iller WHERE id = ?', [eq.il_id])
        .then(([rows]) => {
          const ilAdi = rows[0]?.il_adi || 'Bilinmiyor';
          ilCounts[ilAdi] = (ilCounts[ilAdi] || 0) + 1;
        });
    });
    
    // Biraz bekle
    setTimeout(() => {
      console.log('📋 İl bazında dağılım:');
      Object.entries(ilCounts).sort((a, b) => b[1] - a[1]).forEach(([il, count]) => {
        console.log(`   ${il}: ${count} deprem`);
      });
      
      console.log('\n📊 İlk 10 deprem detayı:');
      earthquakes.slice(0, 10).forEach((eq, i) => {
        pool.query('SELECT il_adi FROM iller WHERE id = ?', [eq.il_id])
          .then(([rows]) => {
            const ilAdi = rows[0]?.il_adi || 'Bilinmiyor';
            console.log(`   ${i + 1}. ${ilAdi} - ${eq.buyukluk} büyüklüğünde - ${eq.tarih_saat} - (${eq.enlem}, ${eq.boylam})`);
          });
      });
      
      setTimeout(() => pool.end().then(() => process.exit(0)), 2000);
    }, 1000);
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

testParse();




















