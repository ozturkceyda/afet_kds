/**
 * Yağış Verilerini Kontrol Scripti
 */

const pool = require('../config/database');

async function checkRainData() {
  try {
    // Yağış miktarı > 0 olan kayıtlar
    const [rainData] = await pool.query(`
      SELECT 
        hava_durumu, 
        COUNT(*) as count, 
        AVG(yagis_miktari) as avg_rain, 
        MAX(yagis_miktari) as max_rain,
        MIN(tarih_saat) as first_date,
        MAX(tarih_saat) as last_date
      FROM hava_durumu_canli 
      WHERE yagis_miktari > 0 
      GROUP BY hava_durumu 
      ORDER BY count DESC
    `);
    
    console.log('\n🌧️  Yağışlı Günler (yagis_miktari > 0):\n');
    if (rainData.length === 0) {
      console.log('  ❌ Hiç yağış kaydı yok!');
    } else {
      rainData.forEach(r => {
        console.log(`  ${r.hava_durumu || 'NULL'}:`);
        console.log(`    - Kayıt sayısı: ${r.count}`);
        console.log(`    - Ortalama yağış: ${parseFloat(r.avg_rain).toFixed(2)}mm`);
        console.log(`    - Maksimum yağış: ${parseFloat(r.max_rain).toFixed(2)}mm`);
        console.log(`    - İlk tarih: ${r.first_date}`);
        console.log(`    - Son tarih: ${r.last_date}`);
        console.log('');
      });
    }
    
    // Yağmurlu hava durumu olan kayıtlar
    const [rainyConditions] = await pool.query(`
      SELECT 
        hava_durumu, 
        COUNT(*) as count,
        AVG(yagis_miktari) as avg_rain
      FROM hava_durumu_canli 
      WHERE hava_durumu LIKE '%yağmur%' 
         OR hava_durumu LIKE '%yağış%'
         OR hava_durumu LIKE '%rain%'
      GROUP BY hava_durumu 
      ORDER BY count DESC
    `);
    
    console.log('\n🌧️  Yağmurlu Hava Durumu Olan Kayıtlar:\n');
    if (rainyConditions.length === 0) {
      console.log('  ❌ Hiç yağmurlu hava durumu kaydı yok!');
    } else {
      rainyConditions.forEach(r => {
        console.log(`  ${r.hava_durumu}: ${r.count} kayıt (Ort. yağış: ${parseFloat(r.avg_rain).toFixed(2)}mm)`);
      });
    }
    
    // Genel istatistik
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN yagis_miktari > 0 THEN 1 ELSE 0 END) as rainy_days,
        SUM(CASE WHEN hava_durumu LIKE '%yağmur%' OR hava_durumu LIKE '%yağış%' OR hava_durumu LIKE '%rain%' THEN 1 ELSE 0 END) as rainy_condition
      FROM hava_durumu_canli
    `);
    
    const stat = stats[0];
    console.log('\n📊 Genel İstatistikler:\n');
    console.log(`  Toplam kayıt: ${stat.total}`);
    console.log(`  Yağış miktarı > 0 olan: ${stat.rainy_days} (${((stat.rainy_days / stat.total) * 100).toFixed(1)}%)`);
    console.log(`  Hava durumu yağmurlu olan: ${stat.rainy_condition} (${((stat.rainy_condition / stat.total) * 100).toFixed(1)}%)`);
    
    // Son 7 günün yağış verileri
    const [recentRain] = await pool.query(`
      SELECT 
        DATE(tarih_saat) as tarih,
        COUNT(*) as count,
        SUM(yagis_miktari) as total_rain,
        AVG(yagis_miktari) as avg_rain,
        MAX(yagis_miktari) as max_rain
      FROM hava_durumu_canli 
      WHERE tarih_saat >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND yagis_miktari > 0
      GROUP BY DATE(tarih_saat)
      ORDER BY tarih DESC
    `);
    
    console.log('\n📅 Son 7 Günün Yağış Verileri:\n');
    if (recentRain.length === 0) {
      console.log('  ❌ Son 7 günde yağış kaydı yok!');
    } else {
      recentRain.forEach(r => {
        console.log(`  ${r.tarih}: ${r.count} kayıt, Toplam: ${parseFloat(r.total_rain).toFixed(2)}mm, Ort: ${parseFloat(r.avg_rain).toFixed(2)}mm, Max: ${parseFloat(r.max_rain).toFixed(2)}mm`);
      });
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

checkRainData();











