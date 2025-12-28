/**
 * Hava Durumu Verilerini Kontrol Scripti
 * Veritabanındaki hava durumu dağılımını gösterir
 */

const pool = require('../config/database');

async function checkWeatherConditions() {
  try {
    const [rows] = await pool.query(`
      SELECT 
        hava_durumu, 
        COUNT(*) as count,
        AVG(sicaklik) as avg_temp,
        AVG(yagis_miktari) as avg_rain
      FROM hava_durumu_canli 
      GROUP BY hava_durumu 
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Hava Durumu Dağılımı:\n');
    console.log('Durum'.padEnd(25) + 'Kayıt Sayısı'.padEnd(15) + 'Ort. Sıcaklık'.padEnd(15) + 'Ort. Yağış');
    console.log('-'.repeat(70));
    
    rows.forEach(row => {
      const avgTemp = row.avg_temp ? parseFloat(row.avg_temp).toFixed(1) + '°C' : '-';
      const avgRain = row.avg_rain ? parseFloat(row.avg_rain).toFixed(2) + 'mm' : '-';
      console.log(
        (row.hava_durumu || 'NULL').padEnd(25) + 
        String(row.count).padEnd(15) + 
        avgTemp.padEnd(15) +
        avgRain
      );
    });
    
    console.log('\n✅ Toplam kayıt sayısı:', rows.reduce((sum, r) => sum + r.count, 0));
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

checkWeatherConditions();

