/**
 * Deprem Verilerini Kontrol Scripti
 */

const pool = require('../config/database');

async function checkEarthquakeData() {
  try {
    // Canlı deprem verileri
    const [liveEarthquakes] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        MIN(tarih_saat) as oldest,
        MAX(tarih_saat) as newest,
        AVG(buyukluk) as avg_magnitude,
        MAX(buyukluk) as max_magnitude,
        MIN(buyukluk) as min_magnitude
      FROM deprem_canli
    `);
    
    console.log('\n🔴 Canlı Deprem Verileri (deprem_canli):\n');
    if (liveEarthquakes[0].total === 0) {
      console.log('  ❌ Hiç canlı deprem kaydı yok!');
    } else {
      const stat = liveEarthquakes[0];
      console.log(`  Toplam kayıt: ${stat.total}`);
      console.log(`  En eski: ${stat.oldest}`);
      console.log(`  En yeni: ${stat.newest}`);
      console.log(`  Ortalama büyüklük: ${parseFloat(stat.avg_magnitude).toFixed(2)}`);
      console.log(`  En büyük: ${parseFloat(stat.max_magnitude).toFixed(2)}`);
      console.log(`  En küçük: ${parseFloat(stat.min_magnitude).toFixed(2)}`);
    }
    
    // Son 10 canlı deprem
    const [recentLive] = await pool.query(`
      SELECT 
        dc.tarih_saat,
        dc.buyukluk,
        dc.derinlik,
        i.il_adi,
        dc.kaynak
      FROM deprem_canli dc
      INNER JOIN iller i ON dc.il_id = i.id
      ORDER BY dc.tarih_saat DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Son 10 Canlı Deprem:\n');
    if (recentLive.length === 0) {
      console.log('  ❌ Son deprem kaydı yok!');
    } else {
      recentLive.forEach(eq => {
        console.log(`  ${eq.tarih_saat} - ${eq.il_adi}: ${parseFloat(eq.buyukluk).toFixed(2)} büyüklüğünde, ${parseFloat(eq.derinlik).toFixed(1)}km derinlik (${eq.kaynak || 'Bilinmiyor'})`);
      });
    }
    
    // Geçmiş deprem verileri
    const [historyEarthquakes] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        MIN(tarih_saat) as oldest,
        MAX(tarih_saat) as newest,
        AVG(buyukluk) as avg_magnitude,
        MAX(buyukluk) as max_magnitude
      FROM deprem_gecmis
    `);
    
    console.log('\n📚 Geçmiş Deprem Verileri (deprem_gecmis):\n');
    if (historyEarthquakes[0].total === 0) {
      console.log('  ❌ Hiç geçmiş deprem kaydı yok!');
    } else {
      const stat = historyEarthquakes[0];
      console.log(`  Toplam kayıt: ${stat.total}`);
      console.log(`  En eski: ${stat.oldest}`);
      console.log(`  En yeni: ${stat.newest}`);
      console.log(`  Ortalama büyüklük: ${parseFloat(stat.avg_magnitude).toFixed(2)}`);
      console.log(`  En büyük: ${parseFloat(stat.max_magnitude).toFixed(2)}`);
    }
    
    // İl bazında dağılım
    const [provinceDistribution] = await pool.query(`
      SELECT 
        i.il_adi,
        COUNT(*) as count,
        MAX(dc.buyukluk) as max_magnitude,
        MAX(dc.tarih_saat) as last_earthquake
      FROM deprem_canli dc
      INNER JOIN iller i ON dc.il_id = i.id
      GROUP BY i.il_adi
      ORDER BY count DESC
    `);
    
    console.log('\n🗺️  İl Bazında Dağılım:\n');
    if (provinceDistribution.length === 0) {
      console.log('  ❌ İl bazında deprem kaydı yok!');
    } else {
      provinceDistribution.forEach(p => {
        console.log(`  ${p.il_adi}: ${p.count} deprem (En büyük: ${parseFloat(p.max_magnitude).toFixed(2)}, Son: ${p.last_earthquake})`);
      });
    }
    
    // Son 24 saatteki depremler
    const [last24h] = await pool.query(`
      SELECT COUNT(*) as count
      FROM deprem_canli
      WHERE tarih_saat >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    
    console.log(`\n⏰ Son 24 Saatteki Depremler: ${last24h[0].count}`);
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

checkEarthquakeData();











